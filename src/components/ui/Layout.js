import React, { Component } from 'react';
import gql from 'graphql-tag';
import ApolloClient from '../helpers/ApolloClient';

import AuthStore from '../stores/AuthStore';

import Login from '../ui/Login';
import Header from '../ui/Header';

export default class Layout extends Component {

    constructor() {
        super();

        this.state = {
            showPanel: !AuthStore.isAuthenticated,
        };
    }

    validateAuth = () => {

        if(!AuthStore.auth.token) AuthStore.logout();

        return new ApolloClient().query({
            query: gql`
                query {
                  user {
                    id
                    firstname
                    lastname
                  }
                }`})
            .then(({ data }) => {
                return data.user;
            })
            .then(user => {
                if(user){
                    AuthStore.update({
                        auth: {
                            user_id: { $set: user.id },
                            firstname: { $set: user.firstname },
                            lastname: { $set: user.lastname },
                        }
                    });

                    this.setState({ showPanel: false });
                }else{
                    AuthStore.logout();
                    this.setState({ showPanel: true });
                }
            });
    };

    componentDidMount = () => {
        this.validateAuth();
    };

    render() {
        return (
            <div className="App">
                <Login showPanel={ this.state.showPanel } validateAuth={ this.validateAuth } refresh={ this.props.refresh } />
                <Header />

                <div className="container">
                    { this.props.children }
                </div>

            </div>
        );
    }
}
