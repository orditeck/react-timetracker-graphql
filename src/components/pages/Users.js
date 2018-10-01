import React, { Component } from 'react';
import updater from 'immutability-helper';
import gql from 'graphql-tag';
import { Redirect } from 'react-router-dom';
import ApolloClient from '../helpers/ApolloClient';
import AuthStore from '../stores/AuthStore';

import Layout from '../ui/Layout';
import Loader from '../ui/Loader';

import { CommandBar } from 'office-ui-fabric-react/lib/CommandBar';
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import { Panel, PanelType } from 'office-ui-fabric-react/lib/Panel';
import { PrimaryButton, DefaultButton } from 'office-ui-fabric-react/lib/Button';
import { MessageBar, MessageBarType } from 'office-ui-fabric-react/lib/MessageBar';

import {
    DetailsList,
    DetailsListLayoutMode as LayoutMode,
    SelectionMode,
    Selection
} from 'office-ui-fabric-react/lib/DetailsList';

export default class Users extends Component {

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
                firstname: null,
                lastname: null,
                email: null,
                password: null
            },
            users: {}
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
                  allUsers(filter: {
                      OR: [
                        { firstname_contains: "${this.state.search}" },
                        { lastname_contains: "${this.state.search}" },
                        { email_contains: "${this.state.search}" }
                      ]
                  }) {
                    id
                    firstname
                    lastname
                    email
                  }
                }`})
            .then(({ data }) => {
                this.setState({ loading: false, users: data.allUsers });

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

    submitAdd = () => {
        if(!this.state.form) return this.setState({ validationError: 'Please fill all the fields.' });
        if(!this.state.form.firstname || !this.state.form.firstname.length) return this.setState({ validationError: 'Please fill in the first name.' });
        if(!this.state.form.lastname || !this.state.form.lastname.length) return this.setState({ validationError: 'Please fill in the last name.' });
        if(!this.state.form.email || !this.state.form.email.length) return this.setState({ validationError: 'Please fill in the email address.' });
        if(!this.state.form.password || !this.state.form.password.length) return this.setState({ validationError: 'Please fill in the password.' });
        if(this.state.form.id) return this.setState({ validationError: 'Invalid request.' });

        this.setState({ loading: true });

        new ApolloClient().mutate({
            mutation: gql`
            mutation {
              createUser(
                authProvider: {
                    email: {
                        email: "${this.state.form.email}"
                        password: "${this.state.form.password}"
                    }
                }
                firstname: "${this.state.form.firstname}"
                lastname: "${this.state.form.lastname}"
              ) {
                id
              }
            }`
        }).then(this.afterSubmit);
    };

    submitEdit = () => {
        if(!this.state.form) return this.setState({ validationError: 'Please fill all the fields.' });
        if(!this.state.form.firstname || !this.state.form.firstname.length) return this.setState({ validationError: 'Please fill in the first name.' });
        if(!this.state.form.lastname || !this.state.form.lastname.length) return this.setState({ validationError: 'Please fill in the last name.' });
        if(!this.state.form.email || !this.state.form.email.length) return this.setState({ validationError: 'Please fill in the email address.' });
        if(!this.state.form.id || !this.state.form.id.length) return this.setState({ validationError: 'Invalid request.' });

        //const password = (this.state.form.password && this.state.form.password.length) ? `password: "${this.state.form.password}"` : '';

        this.setState({ loading: true });

        new ApolloClient().mutate({
            mutation: gql`
            mutation {
              updateUser(
                id: "${this.state.form.id}"
                firstname: "${this.state.form.firstname}"
                lastname: "${this.state.form.lastname}"
              ) {
                id
              }
            }`
        }).then(this.afterSubmit);
    };

    submitDelete = () => {
        if(!this.state.selected || !this.state.selected.id.length){
            this.setState({ deletionPanelOpened: false, pageError: 'Please select an user.' });
            return;
        }

        this.setState({ loading: true });

        new ApolloClient().mutate({
            mutation: gql`
            mutation {
              deleteUser(
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
        const loading = this.state.loading ? <Loader label="Fetching clients..." /> : '';
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
                            onClick: () => this.setState({ client: { id: null, company: '' }, creationPanelOpened: 'Add' }),
                        },
                        {
                            icon: 'FabricFolderSearch',
                            name: 'View Time Sheets',
                            key: 'open_details',
                            disabled: !this.state.selected,
                            onClick: () => this.setState({ fireRedirect: `/timesheets/user/${this.state.selected.id}` }),
                        },
                        {
                            icon: 'Edit',
                            name: 'Edit',
                            key: 'edit',
                            disabled: !this.state.selected,
                            onClick: () => this.setState({ client: this.state.selected, creationPanelOpened: 'Edit' }),
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
                    ref='clientsList'
                    setKey='items'
                    items={ Object.values(this.state.users) }
                    columns={ [
                        { name: 'Lastname', fieldName: 'lastname', key: 'col_lastname' },
                        { name: 'Firstname', fieldName: 'firstname', key: 'col_firstname' },
                        { name: 'Email', fieldName: 'email', key: 'col_email' }
                    ] }
                    selection={ this.selection }
                    layoutMode={ LayoutMode.fixedColumns }
                    selectionMode={ SelectionMode.single }
                    onItemInvoked={ () => this.setState({ fireRedirect: `/timesheets/user/${this.state.selected.id}` }) }
                />

                <Panel
                    isOpen={ (this.state.creationPanelOpened !== false) }
                    type={ PanelType.smallFixedFar }
                    onDismiss={ () => this.setState({ creationPanelOpened: false }) }
                    headerText={`${this.state.creationPanelOpened} User`}
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

                    <TextField
                        label="Firstname"
                        defaultValue={ this.state.form.firstname }
                        onChanged={ (value) => this.setState(updater(this.state, { form: { firstname: { $set: value } } })) }
                    />

                    <TextField
                        label="Lastname"
                        defaultValue={ this.state.form.lastname }
                        onChanged={ (value) => this.setState(updater(this.state, { form: { lastname: { $set: value } } })) }
                    />

                    {
                        this.state.creationPanelOpened === 'Add' ? <div>
                                <TextField
                                    label="Email"
                                    defaultValue={ this.state.form.email }
                                    onChanged={ (value) => this.setState(updater(this.state, { form: { email: { $set: value } } })) }
                                />

                                <TextField
                                    label="Password"
                                    defaultValue={ this.state.form.password }
                                    onChanged={ (value) => this.setState(updater(this.state, { form: { password: { $set: value } } })) }
                                />
                        </div> :
                            <p>
                                Due to a <a href="https://github.com/graphcool/feature-requests/issues/39" target="_blank" rel="noopener noreferrer">graphcool limitation</a>,
                                we can't update email/password on existing user.
                            </p>
                    }
                </Panel>

                <Panel
                    isOpen={ this.state.deletionPanelOpened }
                    type={ PanelType.smallFixedFar }
                    onDismiss={ () => this.setState({ deletionPanelOpened: false }) }
                    headerText='Are you sure you want to delete this client?'
                    onRenderFooterContent={ () => {
                        return (
                            <div>
                                <PrimaryButton onClick={ this.submitDelete } style={ { 'marginRight': '8px' } } className="ms-redDark">Confirm</PrimaryButton>
                                <DefaultButton onClick={ () => this.setState({ deletionPanelOpened: false }) }>Cancel</DefaultButton>
                            </div>
                        );
                    } }
                >
                    <p>All the attached projects and time sheets will be permanently removed.</p>
                    <p><strong>This actions cannot be undone.</strong></p>
                </Panel>

            </Layout>
        );
    }
}
