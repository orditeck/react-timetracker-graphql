import updater from 'immutability-helper';
import cookie from 'react-cookie';
import isValidJsonString from '../helpers/isValidJsonString';

class AuthStore {

    constructor() {
        const AuthStoreCookie = cookie.load('AuthStore', { path: '/' });

        this.defaultAuth = {
            token: false,
            user_id: false,
            firstname: '',
            lastname: ''
        };

        this.auth = (isValidJsonString(AuthStoreCookie)) ? JSON.parse(AuthStoreCookie) : this.defaultAuth;
    }

    update = (object) => {
        for (let name in object)
            if (object.hasOwnProperty(name))
                this[name] = updater(this[name], object[name]);

        this._saveCookies();
    };

    logout = () => {
        this.update({
            auth: { $set: this.defaultAuth }
        });
    };

    _saveCookies = () => {
        cookie.save('AuthStore', this.auth, { path: '/' });
    };

    get isAuthenticated(){
        return (this.auth.token && this.auth.user_id);
    }
}

export default new AuthStore();