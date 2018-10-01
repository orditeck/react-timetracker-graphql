import React, {Component} from 'react';
import gql from 'graphql-tag';
import {Redirect} from 'react-router-dom';
import ApolloClient from '../helpers/ApolloClient';
import {startOfWeek, addDays, subDays, format, parse} from 'date-fns';

import AuthStore from '../stores/AuthStore';

import Layout from '../ui/Layout';
import Loader from '../ui/Loader';

import {TextField} from 'office-ui-fabric-react/lib/TextField';
import {Panel, PanelType} from 'office-ui-fabric-react/lib/Panel';
import {PrimaryButton, DefaultButton, IconButton} from 'office-ui-fabric-react/lib/Button';
import Select from 'react-select';

export default class Timesheet extends Component {

    constructor(props) {
        super();

        this.entryTimer = [];
        this.searchTimer = false;

        this.state = {
            loading: false,
            timesheet: false,
            editionPanelOpened: false,
            entrySavingInPrgress: false,
            fireRedirect: false,
            userId: props.match.params.userId || AuthStore.auth.user_id,
            firstname: '',
            lastname: '',
            entries: [],
            form: {
                timesheet_id: null,
                project_id: null,
                project_title: null,
                date: null,
                time: null,
                notes: '',
            },
            dates: this.getDatesFromProps(props.match.params.week ? props.match.params.week : new Date())
        };
    }

    componentDidMount() {
        this.fetch();
    }

    componentWillReceiveProps(nextProps) {
        if (
            (nextProps.match.params.week !== this.props.match.params.week) ||
            (nextProps.match.params.userId !== this.props.match.params.userId)
        ) {
            this.setState({
                fireRedirect: false,
                dates: this.getDatesFromProps(nextProps.match.params.week ? nextProps.match.params.week : new Date()),
                userId: nextProps.match.params.userId ? nextProps.match.params.userId : AuthStore.auth.user_id
            }, this.fetch);
        }
    }

    getDatesFromProps = (monday) => {
        const date = monday ? monday : new Date();
        const baseDate = startOfWeek(date, {weekStartsOn: 1}); // Week start on Monday
        return [
            format(baseDate, 'YYYY-MM-DD'),
            format(addDays(baseDate, 1), 'YYYY-MM-DD'),
            format(addDays(baseDate, 2), 'YYYY-MM-DD'),
            format(addDays(baseDate, 3), 'YYYY-MM-DD'),
            format(addDays(baseDate, 4), 'YYYY-MM-DD'),
            format(addDays(baseDate, 5), 'YYYY-MM-DD'),
            format(addDays(baseDate, 6), 'YYYY-MM-DD')
        ];
    };

    fetch = () => {
        if (!AuthStore.isAuthenticated) return;

        this.setState({loading: true});
        new ApolloClient().query({
            query: gql`
                query {
                  allTimesheets(filter: {
                    user: { id: "${this.state.userId}" }
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
                  User(id: "${this.state.userId}") {
                    firstname
                    lastname
                  }
                }`
        })
            .then(({data}) => {
                this.setState({loading: false});

                let entries = [];

                data.allTimesheets.forEach((timesheet) => {

                    let formattedDate = format(parse(timesheet.date), 'YYYY-MM-DD');

                    if (timesheet.project.id in entries) {
                        entries[timesheet.project.id]['dates'][formattedDate] = {
                            timesheet_id: timesheet.id,
                            date: formattedDate,
                            time: timesheet.time,
                            notes: unescape(timesheet.notes),
                            saved: true
                        };
                    } else {
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

                this.setState({
                    entries: entries,
                    firstname: data.User ? data.User.firstname : '',
                    lastname: data.User ? data.User.lastname : ''
                });

            })
            .catch(rawError => {
                const error = JSON.parse(JSON.stringify(rawError));
                if (error.graphQLErrors && error.graphQLErrors[0])
                    this.setState({error: error.graphQLErrors[0].message, entries: []});
            });
    };

    searchProject = (search, callback) => {
        if (!AuthStore.isAuthenticated) return callback(null, {options: []});

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
                    }`
            })
                .then(({data}) => {
                    let options = [];

                    if (data && data.allProjects) {
                        data.allProjects.map((project) => {
                            if (!(project.id in this.state.entries)) {
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
                    if (error.graphQLErrors && error.graphQLErrors[0])
                        this.setState({error: error.graphQLErrors[0].message});
                });
        }, 500);

    };

    onProjectChange = (selection) => {
        let {entries} = this.state;

        entries[selection.value] = {
            project: {
                id: selection.value,
                title: selection.label
            },
            dates: {}
        };

        this.setState({entries: entries});
    };

    updateEntry = () => {
        const {form} = this.state;
        const timesheet_id = form.timesheet_id;
        const project_id = form.project_id;
        const date = form.date;
        const time = form.time;
        const notes = form.notes;
        const timerIndex = `${project_id}-${date}`;
        let timerTime = 1000;

        if (this.state.editionPanelOpened) {
            this.setState({loading: true});
            timerTime = 0;
        }

        clearTimeout(this.entryTimer[timerIndex]);

        this.entryTimer[timerIndex] = setTimeout(() => {

            this.setState({entrySavingInPrgress: true});

            let client;

            if (timesheet_id) {

                if (parseFloat(time) > 0) {
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
                        }`
                    });
                } else {
                    client = new ApolloClient().mutate({
                        mutation: gql`
                        mutation {
                          deleteTimesheet( 
                            id: "${timesheet_id}"
                          ) {
                            id
                            time
                          }
                        }`
                    });
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
                        userId: "${this.state.userId}"
                      ) {
                        id
                        time
                      }
                    }`
                });
            }

            client.then(({data}) => {
                let entry = (data.createTimesheet) ? data.createTimesheet : data.updateTimesheet;
                const entryToSave = typeof entry === 'undefined' ? null : {
                    timesheet_id: entry.id,
                    date: date,
                    time: time,
                    notes: notes,
                    saved: true
                };

                this.setState({
                    ...this.state,
                    loading: false,
                    editionPanelOpened: false,
                    entrySavingInPrgress: false,
                    form: {},
                    entries: {
                        ...this.state.entries,
                        [project_id]: {
                            ...this.state.entries[project_id],
                            dates: {
                                ...this.state.entries[project_id].dates,
                                [date]: entryToSave
                            }
                        }
                    }
                });

            })
                .catch(rawError => {
                    const error = JSON.parse(JSON.stringify(rawError));
                    if (error.graphQLErrors && error.graphQLErrors[0])
                        this.setState({error: error.graphQLErrors[0].message});
                });

        }, timerTime);
    };

    weekNavigator = (mode) => () => {
        let baseDate = startOfWeek(this.state.dates[0], {weekStartsOn: 1});
        baseDate = format(mode === 'add' ? addDays(baseDate, 7) : subDays(baseDate, 7), 'YYYY-MM-DD');
        this.setState({fireRedirect: `/timesheets/user/${this.state.userId}/week/${baseDate}`});
    };

    render() {
        const loading = this.state.loading ? <Loader label="Fetching the time sheet..."/> : '';

        const tableHeaderDates = this.state.dates.map((date, index) => {
            return <th key={`th-${index}`}>{format(date, 'dd. Do MMM')}</th>
        });

        const rows = Object.values(this.state.entries).map((project_entry, index) => {
            let hasSavingInProgress = this.state.entrySavingInPrgress;

            return <tr key={`tr-${index}`}>
                <td>{project_entry.project.title}</td>
                {[...Array(7)].map((_, i) => {
                    let date = this.state.dates[i];
                    let entry = date in project_entry.dates && project_entry.dates[date] !== null ? project_entry.dates[date] : false;
                    let time = entry ? project_entry.dates[date].time : '';
                    let timesheet_id = entry ? project_entry.dates[date].timesheet_id : false;
                    let notes = entry ? project_entry.dates[date].notes : '';
                    let saved = entry ? project_entry.dates[date].saved : false;

                    return <td key={`th-${i}`} className={saved ? 'saved' : (this.state.entrySavingInPrgress ? 'disabled' : '')}>
                        <TextField
                            value={time}
                            disabled={hasSavingInProgress}
                            onChanged={(value) => {
                                this.setState({
                                    ...this.state,
                                    form: {
                                        timesheet_id: timesheet_id,
                                        project_id: project_entry.project.id,
                                        project_title: project_entry.project.title,
                                        date: date,
                                        time: value,
                                        notes: notes,
                                        saved: false
                                    },
                                    entries: {
                                        ...this.state.entries,
                                        [project_entry.project.id]: {
                                            ...this.state.entries[project_entry.project.id],
                                            dates: {
                                                ...this.state.entries[project_entry.project.id].dates,
                                                [date]: {
                                                    time: value, saved: false
                                                }
                                            }
                                        }
                                    }
                                }, () => {
                                    this.updateEntry(value);
                                });
                            }}
                        />
                        {!timesheet_id ? '' : <IconButton
                            iconProps={{iconName: 'EditNote'}}
                            title='Edit note for this day'
                            className="empty"
                            onClick={() => this.setState({
                                editionPanelOpened: true,
                                form: {
                                    timesheet_id: timesheet_id,
                                    project_id: project_entry.project.id,
                                    project_title: project_entry.project.title,
                                    date: date,
                                    time: time,
                                    notes: notes
                                }
                            })}
                        />}

                    </td>
                })}
            </tr>
        });

        return (
            <Layout refresh={this.fetch}>

                {loading}

                {this.state.fireRedirect ? <Redirect to={this.state.fireRedirect} push/> : ''}

                {(this.state.userId !== AuthStore.auth.user_id && this.state.firstname) ?
                    <h2>{`${this.state.firstname} ${this.state.lastname}'s time sheet`}</h2> : ''
                }

                <div className="week-navigator">
                    <IconButton iconProps={{iconName: 'ChevronLeft'}} onClick={this.weekNavigator('sub')}/>
                    <table className="ms-Table">
                        <thead>
                        <tr>
                            <th style={{width: '300px'}}>
                                <Select.Async
                                    placeholder="Search a project..."
                                    autoload={false}
                                    loadOptions={this.searchProject}
                                    onChange={this.onProjectChange}
                                />
                            </th>
                            {tableHeaderDates}
                        </tr>
                        </thead>
                        <tbody>
                        {rows}
                        </tbody>
                    </table>
                    <IconButton iconProps={{iconName: 'ChevronRight'}} onClick={this.weekNavigator('add')}/>
                </div>

                <Panel
                    isOpen={(this.state.editionPanelOpened !== false)}
                    type={PanelType.smallFixedFar}
                    onDismiss={() => this.setState({editionPanelOpened: false})}
                    headerText={
                        [
                            `${format(this.state.form.date, 'dddd Do MMM')}`,
                            <small key="smallheaderkey">{this.state.form.project_title}</small>
                        ]}
                    onRenderFooterContent={() => {
                        return (
                            <div>
                                <PrimaryButton
                                    onClick={this.updateEntry}
                                    style={{'marginRight': '8px'}}>
                                    Save
                                </PrimaryButton>
                                <DefaultButton
                                    onClick={() => this.setState({editionPanelOpened: false})}>Cancel</DefaultButton>
                            </div>
                        );
                    }}
                >

                    <TextField
                        label="Time"
                        defaultValue={this.state.form.time}
                        onChanged={(value) => this.setState({
                            ...this.state,
                            form: {
                                ...this.state.form,
                                time: value
                            }
                        })}
                    />

                    <TextField
                        label="Notes"
                        defaultValue={this.state.form.notes}
                        onChanged={(value) => this.setState({
                            ...this.state,
                            form: {
                                ...this.state.form,
                                notes: value
                            }
                        })}
                        multiline
                        autoAdjustHeight
                    />
                </Panel>

            </Layout>
        );
    }
}
