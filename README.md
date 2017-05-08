# Timetracker

Small time tracking React app using GraphQL & Fabric UI.

![Timetracker](http://i.imgur.com/W2qnSb6.gif)

Manage clients & their project and your employees & their time sheets.

I made this project for fun, don't expect regular updates. 
Feel free to PR! Please ★ Star the repo if you use it.

I chose to use [Graphcool](https://graph.cool) as GraphQL API but 
you can use any GraphQL API as long as the schema stay the same. If
you choose to use another API you may have to rewrite the register &
sign in mutations.

## Installation

1. Create a free Graphcool account. You need an account to get the authentication features.
2. Enable Email-Password Auth in Graphcool.
2. Replicate [the schema](https://github.com/orditeck/react-timetracker-graphql/blob/master/timetracker.schema) in your own project. It's currently not possible to import a schema in the Console (Web UI) of Graphcool. I chatted with them and they're working on a CLI tool that will have this feature. Should be ready in the next few days/weeks.
4. Clone the repo
5. Rename [`config.example.js`](https://github.com/orditeck/react-timetracker-graphql/blob/master/src/config.example.js) to `config.js` and set your own API url
6. Run `npm install`
7. Run `npm start`
8. Enjoy! Please consider ★ starring the repo