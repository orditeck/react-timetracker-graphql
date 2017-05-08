import React, { Component } from 'react';
import gql from 'graphql-tag';
import { format, startOfWeek, lastDayOfWeek, getISOWeek, getYear } from 'date-fns';
import ApolloClient from '../helpers/ApolloClient';
import AuthStore from '../stores/AuthStore';

import Layout from '../ui/Layout';
import Loader from '../ui/Loader';

import { CommandBar } from 'office-ui-fabric-react/lib/CommandBar';
import { MessageBar, MessageBarType } from 'office-ui-fabric-react/lib/MessageBar';

import {
    ConstrainMode,
    DetailsList,
    DetailsListLayoutMode as LayoutMode,
    SelectionMode,
    Selection
} from 'office-ui-fabric-react/lib/DetailsList';

export default class Project extends Component {

    constructor() {
        super();

        this.selection = new Selection();
        this.state = {
            loading: true,
            groupBy: 'id',
            project: {}
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
                  Project( id: "${this.props.match.params.projectId}" ) {
                    id
                    title
                    budget
                    client {
                        id
                        company
                    }
                    timesheets {
                        date
                        time 
                        user {
                            id
                            firstname
                            lastname
                        }
                    }
                  }
                }`})
            .then(({ data }) => {
                this.setState({ loading: false, project: data.Project });
            })
            .catch(rawError => {
                const error = JSON.parse(JSON.stringify(rawError));
                if(error.graphQLErrors && error.graphQLErrors[0])
                    this.setState({ loading: false, pageError: error.graphQLErrors[0].message });
            });
    };

    groupWeeksByUser = () => {
        let users = [];
        let weeks = [];

        if(this.state.project.timesheets){
            Object.values(this.state.project.timesheets).forEach(timesheet => {
                let userId = timesheet.user.id;
                let date = timesheet.date;
                let start = format(startOfWeek(date, {weekStartsOn: 1}), 'YYYY-MM-DD');
                let end = format(lastDayOfWeek(date, {weekStartsOn: 1}), 'YYYY-MM-DD');
                let week = `y${getYear(start)}-w${getISOWeek(start)}`;

                if(!weeks[userId]) weeks[userId] = {
                    id: timesheet.user.id,
                    firstname: timesheet.user.firstname,
                    lastname: timesheet.user.lastname,
                    weeks: []
                };

                if(!weeks[userId]['weeks'][week]) weeks[userId]['weeks'][week] = {
                    start: start,
                    end: end,
                    totalTime: 0
                };

                weeks[userId]['weeks'][week].totalTime += parseFloat(timesheet.time);

                users.push({
                    id: timesheet.user.id,
                    firstname: timesheet.user.firstname,
                    lastname: timesheet.user.lastname,
                    date: timesheet.date,
                    time: timesheet.time
                });
            });
        }

        return weeks;
    };

    groupBy = (items, fieldName) => {
        let groups = items.reduce((currentGroups, currentItem, index) => {
            let lastGroup = currentGroups[currentGroups.length - 1];
            let fieldValue = currentItem[fieldName];
            let groupName = this.state.groupBy === 'id' ? `${currentItem['firstname']} ${currentItem['lastname']}` : currentItem['week'];

            if (!lastGroup || lastGroup.value !== fieldValue) {
                currentGroups.push({
                    key: 'group' + fieldValue + index,
                    name: groupName,
                    value: fieldValue,
                    startIndex: index,
                    level: 0,
                    count: 0
                });
            }
            if (lastGroup) {
                lastGroup.count = index - lastGroup.startIndex;
            }
            return currentGroups;
        }, []);

        // Fix last group count
        let lastGroup = groups[groups.length - 1];

        if (lastGroup) {
            lastGroup.count = items.length - lastGroup.startIndex;
        }

        return groups;
    };

    render() {
        const loading = this.state.loading ? <Loader label="Fetching project..." /> : '';
        const pageError = this.state.pageError ? <MessageBar messageBarType={ MessageBarType.error }>{this.state.pageError}</MessageBar> : '';
        const items = (() => {
            let weeks = [];
            Object.values(this.groupWeeksByUser()).forEach(user => {
                Object.values(user.weeks).forEach(week => {
                    weeks.push({
                        id: user.id,
                        firstname: user.firstname,
                        lastname: user.lastname,
                        fullname: `${user.firstname} ${user.lastname}`,
                        week: `From ${week.start} to ${week.end}`,
                        totalTime: week.totalTime
                    });
                });
            });

            return weeks;
        })();
        const columns = this.state.groupBy === 'id' ? [
                { name: 'Weeks', fieldName: 'week', key: 'col_week' },
                { name: 'Time spent', fieldName: 'totalTime', key: 'col_totalTime' }
            ] : [
                { name: 'User', fieldName: 'fullname', key: 'col_fullname' },
                { name: 'Time spent', fieldName: 'totalTime', key: 'col_totalTime' }
            ];

        return (
            <Layout>

                { loading }

                <CommandBar
                    isSearchBoxVisible={ false }
                    items={ [
                        {
                            icon: 'Contact',
                            name: 'Group By Users',
                            key: 'group_by_id',
                            onClick: () => this.setState({ groupBy: 'id' }),
                        },
                        {
                            icon: 'CalendarWorkWeek',
                            name: 'Group By Weeks',
                            key: 'group_by_weeks',
                            onClick: () => this.setState({ groupBy: 'week' }),
                        }
                    ] }
                />

                <br />

                { pageError }

                <DetailsList
                    setKey='items'
                    items={ items }
                    groups={ this.groupBy(items, this.state.groupBy) }
                    columns={ columns }
                    selection={ this.selection }
                    checkboxVisibility={ true }
                    layoutMode={ LayoutMode.justified }
                    isHeaderVisible={ true }
                    selectionMode={ SelectionMode.single }
                    constrainMode={ ConstrainMode.horizontalConstrained }
                    onItemInvoked={ () => {} }
                />

            </Layout>
        );
    }
}
