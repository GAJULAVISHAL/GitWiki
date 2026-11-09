import express from "express";
import "dotenv/config";
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js"

const app = express()

app.use(express.json())

app.get("/help",(req,res)=>{
    res.send("Hello World")
})


app.use("/api/inngest", serve({ client: inngest, functions }));

app.listen(3000,()=>{
    console.log("Server is running on port 3000")
})