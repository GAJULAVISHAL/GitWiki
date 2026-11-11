import express from "express";
import "dotenv/config";
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js"
import indexRouter from "./routes/index.routes.js";
import chatRouter from "./routes/chat.routes.js";

const app = express()

app.use(express.json({ limit: "10mb" }))
app.use("/api/inngest", serve({ client: inngest, functions }));

app.get("/help",(req,res)=>{
    res.send("Hello World")
})

app.use("/api/index",indexRouter)
app.use("/api/chat",chatRouter)

app.listen(3000,()=>{
    console.log("Server is running on port 3000")
})