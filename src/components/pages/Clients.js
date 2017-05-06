import React, { Component } from 'react';
import gql from 'graphql-tag';
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
    ConstrainMode,
    DetailsList,
    DetailsListLayoutMode as LayoutMode,
    SelectionMode,
    Selection
} from 'office-ui-fabric-react/lib/DetailsList';

export default class Clients extends Component {

    constructor() {
        super();

        this.selection = new Selection();
        this.searchTimer = false;
        this.state = {
            loading: true,
            creationPanelOpened: false,
            deletionPanelOpened: false,
            selectedClient: false,
            search: '',
            pageError: '',
            validationError: '',
            form: '',
            clients: {}
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
                  allClients(filter: {
                    company_contains: "${this.state.search}"
                  }) {
                    id
                    company
                    projects {
                        title
                    }
                  }
                }`})
            .then(({ data }) => {
                this.setState({ loading: false, clients: data.allClients });

                // Shitty hack 'cause Office Fabric doesn't handle this case
                let rowSelection = document.querySelectorAll(".ms-DetailsRow");
                if (rowSelection.length) {
                    rowSelection.forEach((object) => {
                        let observer = new MutationObserver((mutations) => {
                            mutations.forEach((mutation) => {
                                const selection = this.selection.getSelection();
                                if(
                                    (this.state.selectedClient && (!selection.length || selection[0].id !== this.state.selectedClient)) ||
                                    (!this.state.selectedClient && selection.length)
                                ){
                                    this.setState({ selectedClient: selection.length ? selection[0] : false })
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
        if(!this.state.form) return this.setState({ validationError: 'Please fill in the company name.' });
        if(!this.state.form.company || !this.state.form.company.length) return this.setState({ validationError: 'Please fill in the company name.' });
        if(this.state.form.id) return this.setState({ validationError: 'Invalid request.' });

        this.setState({ loading: true });

        new ApolloClient().mutate({
            mutation: gql`
            mutation {
              createClient(
                company: "${this.state.form.company}"
              ) {
                id
                company
              }
            }`
        }).then(this.afterSubmit);
    };

    submitEdit = () => {
        if(!this.state.form) return this.setState({ validationError: 'Please select a client.' });
        if(!this.state.form.company || !this.state.form.company.length) return this.setState({ validationError: 'Please fill in the company name.' });
        if(!this.state.form.id || !this.state.form.id.length) return this.setState({ validationError: 'Invalid request.' });

        this.setState({ loading: true });

        new ApolloClient().mutate({
            mutation: gql`
            mutation {
              updateClient(
                id: "${this.state.form.id}"
                company: "${this.state.form.company}"
              ) {
                id
                company
              }
            }`
        }).then(this.afterSubmit);
    };

    submitDelete = () => {
        if(!this.state.selectedClient || !this.state.selectedClient.id.length){
            this.setState({ deletionPanelOpened: false, pageError: 'Please select a client.' });
            return;
        }

        this.setState({ loading: true });

        new ApolloClient().mutate({
            mutation: gql`
            mutation {
              deleteClient(
                id: "${this.state.selectedClient.id}"
              ) {
                id
                company
              }
            }`
        }).then(this.afterSubmit);
    };

    afterSubmit = () => {
        this.fetch();
        this.setState({ deletionPanelOpened: false, creationPanelOpened: false, selectedClient: false, form: false, loading: false });
        this.selection.setItems([]);
    };

    render() {
        const loading = this.state.loading ? <Loader label="Fetching clients..." /> : '';
        const validationError = this.state.validationError ? <MessageBar messageBarType={ MessageBarType.error }>{this.state.validationError}</MessageBar> : '';
        const pageError = this.state.pageError ? <MessageBar messageBarType={ MessageBarType.error }>{this.state.pageError}</MessageBar> : '';

        return (
            <Layout>

                { loading }

                <CommandBar
                    isSearchBoxVisible={ true }
                    items={ [
                        {
                            icon: 'Add',
                            name: 'New',
                            key: 'new',
                            onClick: () => this.setState({ form: { id: null, company: '' }, creationPanelOpened: 'Add' }),
                        },
                        {
                            icon: 'Edit',
                            name: 'Edit',
                            key: 'edit',
                            disabled: !this.state.selectedClient,
                            onClick: () => this.setState({ form: this.state.selectedClient, creationPanelOpened: 'Edit' }),
                        },
                        {
                            icon: 'Delete',
                            name: 'Delete',
                            key: 'remove',
                            disabled: !this.state.selectedClient,
                            onClick: () => this.setState({ deletionPanelOpened: true }),
                        }
                    ] }
                />

                <br />

                { pageError }

                <DetailsList
                    ref='clientsList'
                    setKey='items'
                    items={ Object.values(this.state.clients) }
                    columns={ [
                        { name: 'Name', fieldName: 'company', key: 'col_company' }
                    ] }
                    selection={ this.selection }
                    checkboxVisibility={ true }
                    layoutMode={ LayoutMode.justified }
                    isHeaderVisible={ true }
                    selectionMode={ SelectionMode.single }
                    constrainMode={ ConstrainMode.horizontalConstrained }
                    onItemInvoked={ () => this.setState({ form: this.state.selectedClient, creationPanelOpened: 'Edit' }) }
                />

                <Panel
                    isOpen={ (this.state.creationPanelOpened !== false) }
                    type={ PanelType.smallFixedFar }
                    onDismiss={ () => this.setState({ creationPanelOpened: false }) }
                    headerText={`${this.state.creationPanelOpened} Client`}
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
                        label="Name"
                        defaultValue={ this.state.form.company }
                        onChanged={ (value) => this.setState({ form: { id: this.state.form.id, company: value } }) }
                    />
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
