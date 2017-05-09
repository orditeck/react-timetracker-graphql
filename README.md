# Timetracker

Small time tracking React app using GraphQL & Fabric UI.

Demo: [timetracker-demo.inko.ca](https://timetracker-demo.inko.ca/)  
Email: demo@demo.com  
Password: demo

![Timetracker](http://i.imgur.com/W2qnSb6.gif)

Manage clients & their project and your employees & their time sheets.

I made this project for fun, don't expect regular updates. 
Feel free to PR! Please ★ Star the repo if you use it.

I chose to use [Graphcool](https://graph.cool) as GraphQL API but 
you can use any GraphQL API as long as the schema stay the same. If
you choose to use another API you may have to rewrite the register &
sign in mutations.

## Installation

1. Create a free Graphcool account
2. Enable Email-Password Auth in Graphcool
3. Replicate [the schema](https://github.com/orditeck/react-timetracker-graphql/blob/master/timetracker.schema) in your own project. It's currently not possible to import a schema in the Console (Web UI) of Graphcool. I chatted with them and they're working on a CLI tool that will have this feature. Should be ready in the next few days/weeks.
4. In the `Permissions` tabs of Graphcool Console, make sure to mark all calls with `Authentication required` except `Create` in `User` model (you'll se why later)
5. Clone the repo
6. Copy [`config.example.js`](https://github.com/orditeck/react-timetracker-graphql/blob/master/src/config.example.js) to `config.js` and set your own API url
7. Run `npm install`
8. Run `npm start`
9. Enjoy! Please consider ★ starring the repo

### Create the first user

There is no quick/easy way right now to create the first user.  
Feel free to PR to add one :)

1. Install [React Dev Tools](https://github.com/facebook/react-devtools)
2. Go to `/users` 
3. Find the React Component `<t refresh=fn()>` and set `showPanel` state to `false`
4. You'll now be able to click the `+ New` button, click it to add a user
5. When you're done, go to `/` and log in. Now don't forget to go back to 
Graphcool Console, in `Permissions` tab, mark `Create` in `User` model with `Authentication required`