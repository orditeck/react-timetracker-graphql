import { ApolloClient as Client, createNetworkInterface } from 'react-apollo';
import AuthStore from '../stores/AuthStore';
import Config from '../../config';

const networkInterface = createNetworkInterface({
    uri: Config.graphql_api_url,
});

networkInterface.use([{
    applyMiddleware(req, next) {
        if (!req.options.headers) {
            req.options.headers = {};  // Create the header object if needed.
        }

        // get the authentication token from local storage if it exists
        req.options.headers.authorization = AuthStore.auth.token ? `Bearer ${AuthStore.auth.token}` : null;
        next();
    }
}]);

export default class ApolloClient extends Client {
    constructor(){
        super();
        this.networkInterface = networkInterface;
    }
};
