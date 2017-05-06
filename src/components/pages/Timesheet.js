import React, { Component } from 'react';
import merge from 'deepmerge';
import gql from 'graphql-tag';
import ApolloClient from '../helpers/ApolloClient';
import { startOfWeek, addDays, subDays, format, parse } from 'date-fns';

import AuthStore from '../stores/AuthStore';

import Layout from '../ui/Layout';
import Loader from '../ui/Loader';

import { TextField } from 'office-ui-fabric-react/lib/TextField';
import { Panel, PanelType } from 'office-ui-fabric-react/lib/Panel';
import { PrimaryButton, DefaultButton, IconButton } from 'office-ui-fabric-react/lib/Button';
import Select from 'react-select';

export default class Timesheet extends Component {

    constructor() {
        super();

        const baseDate = startOfWeek(new Date(), { weekStartsOn: 1 }); // Week start on Monday

        this.entryTimer = [];
        this.searchTimer = false;

        this.state = {
            loading: false,
            timesheet: false,
            editionPanelOpened: false,
            entries: [],
            form: {
                timesheet_id: null,
                project_id: null,
                project_title: null,
                date: null,
                time: null,
                notes: '',
            },
            dates: [
                format(baseDate, 'YYYY-MM-DD'),
                format(addDays(baseDate, 1), 'YYYY-MM-DD'),
                format(addDays(baseDate, 2), 'YYYY-MM-DD'),
                format(addDays(baseDate, 3), 'YYYY-MM-DD'),
                format(addDays(baseDate, 4), 'YYYY-MM-DD'),
                format(addDays(baseDate, 5), 'YYYY-MM-DD'),
                format(addDays(baseDate, 6), 'YYYY-MM-DD')
            ]
        };
    }

    componentDidMount() {
        this.fetch();
    }

    fetch = () => {
        if(!AuthStore.isAuthenticated) return;

        this.setState({ loading: true });
        new ApolloClient().query({
            query: gql`
                query {
                  allTimesheets(filter: {
                    user: { id: "${AuthStore.auth.user_id}" }
                    date_gte: "${this.state.dates[0]}"
                    date_lte: "${this.state.dates[6]}"
                    project: {  }
                  }) {
                    id
                    date
                    time
                    notes
                    project {
                        id
                        title
                        client {
                            company
                        }
                    }
                  }
                }`})
            .then(({ data }) => {
                this.setState({ loading: false });

                let entries = [];

                data.allTimesheets.forEach((timesheet) => {

                    let formattedDate = format(parse(timesheet.date), 'YYYY-MM-DD');

                    if(timesheet.project.id in entries) {
                        entries[timesheet.project.id]['dates'][formattedDate] = {
                            timesheet_id: timesheet.id,
                            date: formattedDate,
                            time: timesheet.time,
                            notes: unescape(timesheet.notes),
                            saved: true
                        };
                    }else{
                        entries[timesheet.project.id] = {
                            project: {
                                id: timesheet.project.id,
                                title: `${timesheet.project.client.company} - ${timesheet.project.title}`
                            },
                            dates: {
                                [formattedDate]: {
                                    timesheet_id: timesheet.id,
                                    date: formattedDate,
                                    time: timesheet.time,
                                    notes: unescape(timesheet.notes),
                                    saved: true
                                }
                            }
                        };
                    }

                });

                this.setState({ entries: entries });

            })
            .catch(rawError => {
                const error = JSON.parse(JSON.stringify(rawError));
                if(error.graphQLErrors && error.graphQLErrors[0])
                    this.setState({ error: error.graphQLErrors[0].message, entries: [] });
            });
    };

    searchProject = (search, callback) => {
        if(!AuthStore.isAuthenticated) return callback(null, { options: [] });

        clearTimeout(this.searchTimer);

        this.searchTimer = setTimeout(() => {
            return new ApolloClient().query({
                query: gql`
                    query {
                      allProjects(filter: {
                        OR: [
                          { title_contains: "${search}" },
                          { client: { company_contains: "${search}" } }
                        ]
                      }) {
                        title
                        id
                        client {
                          company
                        }
                      }
                    }`})
                .then(({ data }) => {
                    let options = [];

                    if(data && data.allProjects){
                        data.allProjects.map((project) => {
                            if(!(project.id in this.state.entries)){
                                return options.push({
                                    value: project.id,
                                    label: `${project.client.company} - ${project.title}`
                                });
                            }

                            return false;
                        });
                    }

                    callback(null, {
                        options: options
                    });
                })
                .catch(rawError => {
                    const error = JSON.parse(JSON.stringify(rawError));
                    if(error.graphQLErrors && error.graphQLErrors[0])
                        this.setState({ error: error.graphQLErrors[0].message });
                });
        }, 500);

    };

    onProjectChange = (selection) => {
        let { entries } = this.state;

        entries[selection.value] = {
            project: {
                id: selection.value,
                title: selection.label
            },
            dates: {  }
        };

        this.setState({ entries: entries });
    };

    updateEntry = () => {
        const { form } = this.state;
        const timesheet_id = form.timesheet_id;
        const project_id = form.project_id;
        const date = form.date;
        const time = form.time;
        const notes = form.notes;
        const timerIndex = `${project_id}-${date}`;
        let timerTime = 1000;

        if(this.state.editionPanelOpened){
            this.setState({ loading: true });
            timerTime = 0;
        }

        clearTimeout(this.entryTimer[timerIndex]);

        this.entryTimer[timerIndex] = setTimeout(() => {

            let client;

            if(timesheet_id){

                if(parseFloat(time) > 0){
                    client = new ApolloClient().mutate({
                        mutation: gql`
                        mutation {
                          updateTimesheet( 
                            id: "${timesheet_id}"
                            time: ${parseFloat(time)}
                            notes: "${escape(notes)}"
                          ) {
                            id
                            time
                          }
                        }`});
                }else{
                    client = new ApolloClient().mutate({
                        mutation: gql`
                        mutation {
                          deleteTimesheet( 
                            id: "${timesheet_id}"
                          ) {
                            id
                            time
                          }
                        }`});
                }

            } else {
                client = new ApolloClient().mutate({
                    mutation: gql`
                    mutation {
                      createTimesheet(
                        projectId: "${project_id}"
                        date: "${parse(date).toISOString()}"
                        time: ${parseFloat(time)}
                        notes: "${notes}"
                        userId: "${AuthStore.auth.user_id}"
                      ) {
                        id
                        time
                      }
                    }`});
            }

            client.then(({ data }) => {
                let entry = (data.createTimesheet) ? data.createTimesheet : data.updateTimesheet;
                const entryToSave = typeof entry === 'undefined' ? null : {
                        timesheet_id: entry.id,
                        date: date,
                        time: time,
                        notes: notes,
                        saved: true
                    };

                this.setState({
                    loading: false,
                    editionPanelOpened: false,
                    form: { },
                    entries: merge(this.state.entries, {
                        [project_id]: {
                            dates: {
                                [date]: entryToSave
                            }
                        }
                    })
                });

            })
                .catch(rawError => {
                    const error = JSON.parse(JSON.stringify(rawError));
                    if(error.graphQLErrors && error.graphQLErrors[0])
                        this.setState({ error: error.graphQLErrors[0].message });
                });

        }, timerTime);
    };

    weekNavigator = (mode) => () => {
        let baseDate = startOfWeek(this.state.dates[0], { weekStartsOn: 1 });
        baseDate = mode === 'add' ? addDays(baseDate, 7) : subDays(baseDate, 7);
        const dates = [
            format(baseDate, 'YYYY-MM-DD'),
            format(addDays(baseDate, 1), 'YYYY-MM-DD'),
            format(addDays(baseDate, 2), 'YYYY-MM-DD'),
            format(addDays(baseDate, 3), 'YYYY-MM-DD'),
            format(addDays(baseDate, 4), 'YYYY-MM-DD'),
            format(addDays(baseDate, 5), 'YYYY-MM-DD'),
            format(addDays(baseDate, 6), 'YYYY-MM-DD')
        ];
        this.setState({ dates: dates, loading: true }, this.fetch);
    };

    render() {
        const loading = this.state.loading ? <Loader label="Fetching the time sheet..." /> : '';

        const tableHeaderDates = this.state.dates.map((date, index) => {
            return <th key={`th-${index}`}>{format(date, 'dd. Do MMM')}</th>
        });

        const rows = Object.values(this.state.entries).map((project_entry, index) => {
            return <tr key={`tr-${index}`}>
                <td>{project_entry.project.title}</td>
                {[...Array(7)].map((_, i) => {
                    let date = this.state.dates[i];
                    let entry = date in project_entry.dates && project_entry.dates[date] !== null ? project_entry.dates[date] : false;
                    let time = entry ? project_entry.dates[date].time : '';
                    let timesheet_id = entry ? project_entry.dates[date].timesheet_id : false;
                    let notes = entry ? project_entry.dates[date].notes : '';
                    let saved = entry ? project_entry.dates[date].saved : false;

                    return <td key={`th-${i}`} className={ saved ? 'saved' : '' }>
                        <TextField
                            value={ time }
                            onChanged={ (value) => {
                                this.setState({
                                    form: {
                                        timesheet_id: timesheet_id,
                                        project_id: project_entry.project.id,
                                        project_title: project_entry.project.title,
                                        date: date,
                                        time: value,
                                        notes: notes,
                                        saved: false
                                    },
                                    entries: merge(this.state.entries, {
                                            [project_entry.project.id]: {
                                                dates: {
                                                    [date]: { time: value, saved: false }
                                                }
                                            }
                                        })
                                }, () => {
                                    this.updateEntry(value);
                                });
                            } }
                        />
                        { !timesheet_id ? '' : <IconButton
                                iconProps={ { iconName: 'EditNote' } }
                                title='Edit note for this day'
                                className="empty"
                                onClick={ () => this.setState({
                                    editionPanelOpened: true,
                                    form: {
                                        timesheet_id: timesheet_id,
                                        project_id: project_entry.project.id,
                                        project_title: project_entry.project.title,
                                        date: date,
                                        time: time,
                                        notes: notes
                                    }
                                }) }
                            /> }

                    </td>
                })}
            </tr>
        });

        return (
            <Layout refresh={this.fetch}>

                {loading}

                <div className="week-navigator">
                    <IconButton iconProps={ { iconName: 'ChevronLeft' } } onClick={ this.weekNavigator('sub') } />
                    <table className="ms-Table">
                        <thead>
                        <tr>
                            <th style={{ width: '300px' }}>
                                <Select.Async
                                    placeholder="Search a project..."
                                    autoload={ false }
                                    loadOptions={ this.searchProject }
                                    onChange={ this.onProjectChange }
                                />
                            </th>
                            { tableHeaderDates }
                        </tr>
                        </thead>
                        <tbody>
                        {rows}
                        </tbody>
                    </table>
                    <IconButton iconProps={ { iconName: 'ChevronRight' } } onClick={ this.weekNavigator('add') } />
                </div>

                <Panel
                    isOpen={ (this.state.editionPanelOpened !== false) }
                    type={ PanelType.smallFixedFar }
                    onDismiss={ () => this.setState({ editionPanelOpened: false }) }
                    headerText={
                        [
                            `${format(this.state.form.date, 'dddd Do MMM')}`,
                            <small key="smallheaderkey">{this.state.form.project_title}</small>
                        ]}
                    onRenderFooterContent={ () => {
                        return (
                            <div>
                                <PrimaryButton
                                    onClick={ this.updateEntry }
                                    style={ { 'marginRight': '8px' } } >
                                    Save
                                </PrimaryButton>
                                <DefaultButton onClick={ () => this.setState({ editionPanelOpened: false }) } >Cancel</DefaultButton>
                            </div>
                        );
                    } }
                >

                    <TextField
                        label="Time"
                        defaultValue={ this.state.form.time }
                        onChanged={ (value) => this.setState(merge(this.state, { form: { time: value } })) }
                    />

                    <TextField
                        label="Notes"
                        defaultValue={ this.state.form.notes }
                        onChanged={ (value) => this.setState(merge(this.state, { form: { notes: value } })) }
                        multiline
                        autoAdjustHeight
                    />
                </Panel>

            </Layout>
        );
    }
}
