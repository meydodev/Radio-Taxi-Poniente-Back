"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mysql2_1 = __importDefault(require("mysql2"));
const connection = mysql2_1.default.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'radio_taxi_poniente',
});
/*
const connection = mysql.createConnection({
    host: 'bhkq4ktdt8hu8why4ffk-mysql.services.clever-cloud.com',
    user: 'uc7nsrkdmz5abri9',
    password: 'j1kJ3RAOsRfCCC5pqCem',
    database: 'bhkq4ktdt8hu8why4ffk',
});
*/
exports.default = connection;
