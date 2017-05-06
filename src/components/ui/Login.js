import React, { Component } from 'react';
import PropTypes from 'prop-types';
import gql from 'graphql-tag';
import ApolloClient from '../helpers/ApolloClient';
import AuthStore from '../stores/AuthStore';

import { Panel, PanelType } from 'office-ui-fabric-react/lib/Panel';
import { PrimaryButton, DefaultButton } from 'office-ui-fabric-react/lib/Button';
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import { MessageBar, MessageBarType } from 'office-ui-fabric-react/lib/MessageBar';

export default class Login extends Component {

    static contextTypes = {
        router: PropTypes.object
    };

    constructor(props) {
        super();

        this.state = {
            email: '',
            password: '',
            error: false,
        };
    }

    onEmailChange = value => {
        this.setState({ email: value });
    };

    onPasswordChange = value => {
        this.setState({ password: value });
    };

    onSubmit = () => {

        new ApolloClient().mutate({
            mutation: gql`
            mutation {
              signinUser(email: {
                email: "${this.state.email}"
                password: "${this.state.password}"
              }) {
                token
              }
            }`,
        })
            .then(({ data }) => {
                if(data.signinUser && data.signinUser.token){

                    AuthStore.update({
                        auth: {
                            token: { $set: data.signinUser.token }
                        }
                    });

                    this.props.validateAuth().then(() => {
                        this.props.refresh();
                    });
                }
            })
            .catch(rawError => {
                const error = JSON.parse(JSON.stringify(rawError));
                if(error.graphQLErrors && error.graphQLErrors[0])
                    this.setState({ error: error.graphQLErrors[0].message });
            });
    };

    render () {
        const error = this.state.error ? <MessageBar messageBarType={ MessageBarType.error }>{this.state.error}</MessageBar> : '';

        return (
            <aside>
                <Panel
                    isOpen={ this.props.showPanel }
                    hasCloseButton={ false }
                    type={ PanelType.smallFixedFar }
                    headerText='Sign In'
                    onRenderFooterContent={ () => {
                        return (
                            <div>
                                <PrimaryButton
                                    onClick={this.onSubmit}
                                    style={ { 'marginRight': '8px' } } >
                                    Log in
                                </PrimaryButton>
                                <DefaultButton>
                                    Cancel
                                </DefaultButton>
                            </div>
                        );
                    } }
                >
                    <p>
                        Please sign in to access your timesheet.
                    </p>

                    { error }

                    <TextField label='Email Address' required={ true } onChanged={this.onEmailChange} />
                    <TextField type='password' label='Password' required={ true } onChanged={this.onPasswordChange} />
                </Panel>
            </aside>
        );
    }
}
