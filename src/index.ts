import express from 'express'

import { Router } from 'express';
import { Application } from "express";
import { AppDataSource } from "./data-source";

import { SchoolRouter } from "./routes/school";
import { YearRouter } from "./routes/year";
import { BimesterRouter } from "./routes/bimester";

const bodyParser = require('body-parser');
const app: Application = express();
const cors = require('cors');
const route = Router()

app.use(bodyParser.json());
app.use(cors({origin: true}));

route.use('/year', YearRouter)
route.use('/bimester', BimesterRouter)
route.use('/school', SchoolRouter)

app.use(route)

AppDataSource.initialize()
  .then(() => {
    app.listen(3333, () => {
      console.log('Server running on port 3333');
    });
  })
  .catch((err) => {
    console.log(err);
  });
