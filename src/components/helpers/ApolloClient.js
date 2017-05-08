import { ApolloClient as Client, createNetworkInterface } from 'react-apollo';
import AuthStore from '../stores/AuthStore';

const networkInterface = createNetworkInterface({
    uri: 'https://api.graph.cool/simple/v1/PROJECT_ID_HERE',
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
