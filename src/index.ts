import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import readline from "node:readline"
import { stdin, stdout } from "node:process";

config();

const db = new PrismaClient();

const rl = readline.createInterface({ input: stdin, output: stdout });

const createTodo = tool(async (todo: string) => {
    try {
        const newTodo = await db.todo.create({
            data: {
                todo: todo
            }
        });

        return newTodo.id;
    } catch (err) {
        if (err instanceof Error) {
            return err.message;
        }
    }
}, {
    name: "createTodo",
    description: "This function creates the todo in the database and send there ID in the response.",
    schema: z.string().describe("The todo task.")
});

const listAllTodos = tool(async () => {
    try {
        const allTodos = await db.todo.findMany({});

        const lstOfTodos: string[] = []
        allTodos.forEach((todo) => {
            lstOfTodos.push(todo.todo)
        });

        return lstOfTodos;
    } catch (err) {
        if (err instanceof Error) {
            return err.message;
        }
    }
}, {
    name: "readAllTodos",
    description: "This function gives all todos in the response without taking any parameter",
});

const deleteTodo = tool(async (id: string) => {
    console.log(`ID entered by gpt ${id}`);
    try {
        const deletedTodo = await db.todo.delete({
            where: {
                id: parseInt(id),
            }
        });

        return `DeletedTodo: ${deletedTodo.todo}`
    } catch (err) {
        if (err instanceof Error) {
            return err.message;
        }
    }
}, {
    name: "deleteTodo",
    description: "This function delete the todo on the basis of there ID it takes ID as a string then convert that in number and runs the function",
    schema: z.string().describe("This is an ID of todo which is going to be deleted the ID first comes with a type of string then it get's converted in number to proceed")
})

const updateTodo = tool(async ({ id, newTodo }: { id: string, newTodo: string }) => {
    try {
        const updatedTodo = await db.todo.update({
            where: {
                id: parseInt(id)
            },
            data: {
                todo: newTodo
            }
        });

        return `UpdateTodo: {
        id: ${updatedTodo.id},
        todo: ${updatedTodo.todo}
        }`
    } catch (err) {
        if (err instanceof Error) {
            return err.message;
        }
    }
}, {
    name: "updateTodo",
    description: "This function takes todo ID and newTodo which is going to be updated of the todo ID with the same ID entered and then there todo will get replaced with the newTodo",
    schema: z.object({
        id: z.string().describe("The unique ID of the todo for finding it"),
        newTodo: z.string().describe("The new todo which is going to be replaced by the the Unique ID todo's todo"),
    })
})

const tools = [createTodo, listAllTodos, deleteTodo, updateTodo]

const model = new ChatGoogleGenerativeAI({
    modelName: "gemini-pro",
    maxOutputTokens: 2048,
    apiKey: process.env.GEMINI_API_KEY
});

async function init() {
    rl.question("> ", async function (prompt) {

        if (prompt.toLowerCase() === "exit") {
            rl.close();
            console.log(`You are Exit..
            Hope you will be happy with my service 😉✌️`);
            return;
        }

        const checkPoint = new MemorySaver();

        const agent = createReactAgent({
            llm: model,
            tools,
            checkpointSaver: checkPoint
        });

        const response = await agent.invoke(
            { messages: [new HumanMessage(prompt)] },
            { configurable: { thread_id: "42" } },
        );

        const toolResponse = response.messages.find(msg => msg.constructor.name === "ToolMessage") || null;

        console.log(toolResponse?.content);

        init()
    })
}

init();