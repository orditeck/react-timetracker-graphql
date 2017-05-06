# Timetracker

Small time tracking React app using GraphQL & Fabric UI.

![Timetracker](http://i.imgur.com/W2qnSb6.gif)

Manage clients & their project and your employees & their time sheets.

I chose to use [Graphcool](https://graph.cool) as GraphQL API but 
you can use any GraphQL API as long as the schema stay the same. If
you choose to use another API you may have to rewrite the register &
sign in mutations.

## Quick deploy

Quick deploying allows you to try the app but not fully. You can create 
clients and projects but you won't be able to actually create time
sheets. You have to be authenticated to create a time sheet. And to be
authenticated, you need a free registered account with Graphcool because 
non-registered disposable APIs don't have the authentication feature.

To quick deploy:

1. Clone the repo
2. Click [![graphql-up](http://static.graph.cool/images/graphql-up.svg)](https://www.graph.cool/graphql-up/new?source=https://raw.githubusercontent.com/orditeck/react-timetracker-graphql/master/timetracker.schema)  to deploy your GraphQL API. It's free, no account required!
3. Click the "Get GraphQL API" button, it'll deploy your API and give you an URL like `https://api.graph.cool/simple/v1/UNIQUE_NAME`
4. Edit [this line](https://github.com/orditeck/react-timetracker-graphql/blob/master/src/components/helpers/ApolloClient.js#L5) and put your own API URL. 
3. Run `npm install`
4. Run `npm start`
5. Enjoy!

## Full install with authentication

1. Clone the repo
2. Create a free Graphcool account. You need an account to get the authentication features.
3. Enable Email-Password Auth in Graphcool.
4. Replicate [the schema](https://github.com/orditeck/react-timetracker-graphql/blob/master/timetracker.schema) in your own project. It's currently not possible to import a schema in the Console (Web UI) of Graphcool. I chatted with them and they're working on a CLI tool that will have this feature. Should be ready in the next few days/weeks.
5. Edit [this line](https://github.com/orditeck/react-timetracker-graphql/blob/master/src/components/helpers/ApolloClient.js#L5) and put your own API URL. 
6. Edit [this line](https://github.com/orditeck/react-timetracker-graphql/blob/master/src/components/stores/AuthStore.js#L10) and set `this.authAvailable` to `true`. 
7. Run `npm install`
8. Run `npm start`
9. Enjoy!


---

Upcoming features:

- Ability to specify project budget in hours
- Ability to view worked/remaining hours on project listing
- Ability to view all times entries for a specific project, with filters like employee, dates, ...
- Pagination
- And probably more useful stuff

I made this project for fun, don't expect regular updates. 
Feel free to PR!