import React, { Component } from 'react';
import gql from 'graphql-tag';
import { Redirect } from 'react-router-dom'
import ApolloClient from '../helpers/ApolloClient';
import AuthStore from '../stores/AuthStore';

import Layout from '../ui/Layout';
import Loader from '../ui/Loader';

import Select from 'react-select';
import { Label } from 'office-ui-fabric-react/lib/Label';
import { CommandBar } from 'office-ui-fabric-react/lib/CommandBar';
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import { Panel, PanelType } from 'office-ui-fabric-react/lib/Panel';
import { PrimaryButton, DefaultButton } from 'office-ui-fabric-react/lib/Button';
import { MessageBar, MessageBarType } from 'office-ui-fabric-react/lib/MessageBar';

import {
    ConstrainMode,
    DetailsList,
    DetailsListLayoutMode as LayoutMode,
    SelectionMode,
    Selection
} from 'office-ui-fabric-react/lib/DetailsList';

export default class Projects extends Component {

    constructor() {
        super();

        this.selection = new Selection();
        this.searchTimer = false;
        this.state = {
            loading: true,
            creationPanelOpened: false,
            deletionPanelOpened: false,
            selected: false,
            fireRedirect: false,
            search: '',
            pageError: '',
            validationError: '',
            form: {
                id: null,
                budget: null,
                title: null,
                company: null,
                client_id: null
            },
            projects: false
        };
    }

    componentDidMount() {
        this.fetch();

        let searchBox = document.querySelectorAll(".ms-CommandBarSearch-input");
        if (searchBox.length) {
            let inputBox = searchBox.item(0);
            inputBox.onkeydown = (e) => {
                clearTimeout(this.searchTimer);

                this.searchTimer = setTimeout(() => {
                    this.setState({ search: e.target.value });
                    this.fetch();
                }, 1000);
            }
        }
    }

    fetch = () => {
        if(!AuthStore.isAuthenticated) return;

        this.setState({ loading: true });
        new ApolloClient().query({
            query: gql`
                query {
                  allProjects(filter: {
                    title_contains: "${this.state.search}"
                    client: {  }
                  }) {
                    id
                    title
                    budget
                    client {
                        id
                        company
                    }
                    timesheets {
                        time 
                    }
                  }
                }`})
            .then(({ data }) => {
                this.setState({ loading: false, projects: data.allProjects });

                // Shitty hack 'cause Office Fabric doesn't handle this case
                let rowSelection = document.querySelectorAll(".ms-DetailsRow");
                if (rowSelection.length) {
                    rowSelection.forEach((object) => {
                        let observer = new MutationObserver((mutations) => {
                            mutations.forEach((mutation) => {
                                const selection = this.selection.getSelection();
                                if(
                                    (this.state.selected && (!selection.length || selection[0].id !== this.state.selected)) ||
                                    (!this.state.selected && selection.length)
                                ){
                                    this.setState({ selected: selection.length ? selection[0] : false })
                                }

                            });
                        });

                        observer.observe(object, { attributes: true });
                    })
                }
            })
            .catch(rawError => {
                const error = JSON.parse(JSON.stringify(rawError));
                if(error.graphQLErrors && error.graphQLErrors[0])
                    this.setState({ loading: false, pageError: error.graphQLErrors[0].message });
            });
    };

    searchClient = (search, callback) => {
        if(!AuthStore.isAuthenticated) return callback(null, { options: [] });

        const query = search || this.state.form.company;

        clearTimeout(this.searchTimer);

        this.searchTimer = setTimeout(() => {
            return new ApolloClient().query({
                query: gql`
                    query {
                      allClients(filter: {
                        company_contains: "${query}"
                      }) {
                        id
                        company
                      }
                    }`})
                .then(({ data }) => {
                    let options = [];

                    if(data && data.allClients){
                        data.allClients.map((client) => {
                            return options.push({
                                value: client.id,
                                label: client.company
                            });
                        });
                    }

                    callback(null, {
                        options: options
                    });
                })
                .catch(rawError => {
                    const error = JSON.parse(JSON.stringify(rawError));
                    if(error.graphQLErrors && error.graphQLErrors[0])
                        this.setState({ validationError: error.graphQLErrors[0].message });
                });
        }, 500);

    };

    onClientSelectChange = (selection) => {
        this.setState({
            ...this.state,
            form: {
                ...this.state.form,
                company: selection ? selection.label : null,
                client_id: selection ? selection.value : null,
            }
        });
    };

    submitAdd = () => {
        const { form } = this.state;
        if(!form) return this.setState({ validationError: 'Please fill in the company name.' });
        if(!form.client_id || !form.client_id.length) return this.setState({ validationError: 'Please select the client.' });
        if(!form.title || !form.title.length) return this.setState({ validationError: 'Please fill in the project title.' });
        if(form.id) return this.setState({ validationError: 'Invalid request.' });

        this.setState({ loading: true });

        new ApolloClient().mutate({
            mutation: gql`
            mutation {
              createProject(
                title: "${form.title}"
                budget: ${parseFloat(form.budget) || 0}
                clientId: "${form.client_id}"
              ) {
                id
              }
            }`
        }).then(this.afterSubmit);
    };

    submitEdit = () => {
        const form = this.state.form || false;
        if(!form) return this.setState({ validationError: 'Please select a project.' });
        if(!form.client_id || !form.client_id.length) return this.setState({ validationError: 'Please select the client.' });
        if(!form.title || !form.title.length) return this.setState({ validationError: 'Please fill in the project title.' });
        if(!form.id || !form.id.length) return this.setState({ validationError: 'Invalid request.' });

        this.setState({ loading: true });

        new ApolloClient().mutate({
            mutation: gql`
            mutation {
              updateProject(
                id: "${form.id}"
                title: "${form.title}"
                budget: ${parseFloat(form.budget) || 0}
                clientId: "${form.client_id}"
              ) {
                id
              }
            }`
        }).then(this.afterSubmit);
    };

    submitDelete = () => {
        if(!this.state.selected || !this.state.selected.id.length){
            this.setState({ deletionPanelOpened: false, pageError: 'Please select a project.' });
            return;
        }

        this.setState({ loading: true });

        new ApolloClient().mutate({
            mutation: gql`
            mutation {
              deleteProject(
                id: "${this.state.selected.id}"
              ) {
                id
              }
            }`
        }).then(this.afterSubmit);
    };

    afterSubmit = () => {
        this.fetch();
        this.setState({ deletionPanelOpened: false, creationPanelOpened: false, selected: false, form: false, loading: false });
        this.selection.setItems([]);
    };

    render() {
        const loading = this.state.loading ? <Loader label="Fetching projects..." /> : '';
        const validationError = this.state.validationError ? <MessageBar messageBarType={ MessageBarType.error }>{this.state.validationError}</MessageBar> : '';
        const pageError = this.state.pageError ? <MessageBar messageBarType={ MessageBarType.error }>{this.state.pageError}</MessageBar> : '';

        return (
            <Layout>

                { loading }

                { this.state.fireRedirect ? <Redirect to={this.state.fireRedirect} push /> : '' }

                <CommandBar
                    isSearchBoxVisible={ true }
                    items={ [
                        {
                            icon: 'Add',
                            name: 'New',
                            key: 'new',
                            onClick: () => this.setState({ form: { id: null, title: null, company: null, client_id: null }, creationPanelOpened: 'Add' }),
                        },
                        {
                            icon: 'FabricFolderSearch',
                            name: 'Open details',
                            key: 'open_details',
                            disabled: !this.state.selected,
                            onClick: () => this.setState({ fireRedirect: `/projects/${this.state.selected.id}` }),
                        },
                        {
                            icon: 'Edit',
                            name: 'Edit',
                            key: 'edit',
                            disabled: !this.state.selected,
                            onClick: () => this.setState({ form: this.state.selected, creationPanelOpened: 'Edit' }),
                        },
                        {
                            icon: 'Delete',
                            name: 'Delete',
                            key: 'remove',
                            disabled: !this.state.selected,
                            onClick: () => this.setState({ deletionPanelOpened: true }),
                        }
                    ] }
                />

                <br />

                { pageError }

                <DetailsList
                    setKey='items'
                    items={ [ ...Object.values(this.state.projects).map(project => {
                        let totalTime = 0;
                        if(project.timesheets){
                            project.timesheets.forEach((timesheet) => {
                                totalTime += parseFloat(timesheet.time);
                            });
                        }
                        return {
                            id: project.id,
                            title: project.title,
                            budget: project.budget,
                            company: project.client ? project.client.company : null,
                            client_id: project.client ? project.client.id : null,
                            totalTime: totalTime
                        }
                    }) ] }
                    columns={ [
                        { name: 'Company', fieldName: 'company', key: 'col_company' },
                        { name: 'Project', fieldName: 'title', key: 'col_project', minWidth: 400 },
                        { name: 'Budget', fieldName: 'budget', key: 'col_budget' },
                        { name: 'Time spent', fieldName: 'totalTime', key: 'col_totalTime' }
                    ] }
                    selection={ this.selection }
                    checkboxVisibility={ true }
                    layoutMode={ LayoutMode.justified }
                    isHeaderVisible={ true }
                    selectionMode={ SelectionMode.single }
                    constrainMode={ ConstrainMode.horizontalConstrained }
                    onItemInvoked={ () => this.setState({ fireRedirect: `/projects/${this.state.selected.id}` }) }
                />

                <Panel
                    isOpen={ (this.state.creationPanelOpened !== false) }
                    type={ PanelType.smallFixedFar }
                    onDismiss={ () => this.setState({ creationPanelOpened: false }) }
                    headerText={`${this.state.creationPanelOpened} Project`}
                    onRenderFooterContent={ () => {
                        return (
                            <div>
                                <PrimaryButton
                                    onClick={ this.state.creationPanelOpened === 'Add' ? this.submitAdd : this.submitEdit }
                                    style={ { 'marginRight': '8px' } } >
                                    Save
                                </PrimaryButton>
                                <DefaultButton onClick={ () => this.setState({ creationPanelOpened: false }) } >Cancel</DefaultButton>
                            </div>
                        );
                    } }
                >

                    { validationError }

                    <Label>Company</Label>
                    <Select.Async
                        value={ this.state.form.client_id }
                        loadOptions={ this.searchClient }
                        onChange={ this.onClientSelectChange }
                    />

                    <br />

                    <TextField
                        label="Title"
                        defaultValue={ this.state.form.title }
                        onChanged={(value) => this.setState({
                            ...this.state,
                            form: {
                                ...this.state.form,
                                title: value
                            }
                        })}
                    />

                    <TextField
                        label="Budget"
                        defaultValue={ this.state.form.budget }
                        onChanged={(value) => this.setState({
                            ...this.state,
                            form: {
                                ...this.state.form,
                                budget: value
                            }
                        })}
                    />
                </Panel>

                <Panel
                    isOpen={ this.state.deletionPanelOpened }
                    type={ PanelType.smallFixedFar }
                    onDismiss={ () => this.setState({ deletionPanelOpened: false }) }
                    headerText='Are you sure you want to delete this project?'
                    onRenderFooterContent={ () => {
                        return (
                            <div>
                                <PrimaryButton onClick={ this.submitDelete } style={ { 'marginRight': '8px' } } className="ms-redDark">Confirm</PrimaryButton>
                                <DefaultButton onClick={ () => this.setState({ deletionPanelOpened: false }) }>Cancel</DefaultButton>
                            </div>
                        );
                    } }
                >
                    <p>All the attached time sheets will be permanently removed.</p>
                    <p><strong>This actions cannot be undone.</strong></p>
                </Panel>

            </Layout>
        );
    }
}
