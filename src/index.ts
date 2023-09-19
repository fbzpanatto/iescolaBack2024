import express from 'express'

import { Router } from 'express';
import { Application } from "express";

const bodyParser = require('body-parser');
const app: Application = express();
const cors = require('cors');
const route = Router()

app.use(bodyParser.json());

app.use(cors({origin: true}));

route.use('/home', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Hello World!'
  })
})

app.use(route)

app.listen(3333, () => {
  console.log('Server started on port 3333!');
});
