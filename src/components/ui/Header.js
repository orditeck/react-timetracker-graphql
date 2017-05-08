import React, { Component } from 'react';
import { Link } from 'react-router-dom'

export default class Header extends Component {

    render() {
        return (
            <header id="mastheader">

                <div className="left ms-font-xl ms-fontColor-white">
                    Timetracker
                    <i className='ms-Icon ms-Icon--JS' />
                </div>

                <div className="right">
                    <Link className='button ms-fontColor-white' to='/'>Timesheets</Link>
                    <Link className='button ms-fontColor-white' to='/projects'>Projects</Link>
                    <Link className='button ms-fontColor-white' to='/clients'>Clients</Link>
                    <Link className='button ms-fontColor-white' to='/users'>Users</Link>
                </div>

            </header>
        );
    }
}
