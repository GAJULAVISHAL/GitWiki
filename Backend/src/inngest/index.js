import {inngest} from "./client.js"
import { askQuestionFn } from "./functions/askQuestions.js"
import { helloWorld } from "./functions/hello.js"
import { indexRepo } from "./functions/indexRepo.js"
export {inngest}
export const functions = [helloWorld, indexRepo, askQuestionFn]