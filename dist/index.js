"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
const google_genai_1 = require("@langchain/google-genai");
const langgraph_1 = require("@langchain/langgraph");
const prebuilt_1 = require("@langchain/langgraph/prebuilt");
const messages_1 = require("@langchain/core/messages");
const dotenv_1 = require("dotenv");
const client_1 = require("@prisma/client");
const node_readline_1 = __importDefault(require("node:readline"));
const node_process_1 = require("node:process");
(0, dotenv_1.config)();
const db = new client_1.PrismaClient();
const rl = node_readline_1.default.createInterface({
  input: node_process_1.stdin,
  output: node_process_1.stdout,
});
const createTodo = (0, tools_1.tool)(
  (todo) =>
    __awaiter(void 0, void 0, void 0, function* () {
      try {
        const newTodo = yield db.todo.create({
          data: {
            todo: todo,
          },
        });
        return newTodo.id;
      } catch (err) {
        if (err instanceof Error) {
          return err.message;
        }
      }
    }),
  {
    name: "createTodo",
    description:
      "This function creates the todo in the database and send there ID in the response.",
    schema: zod_1.z.string().describe("The todo task."),
  }
);
const listAllTodos = (0, tools_1.tool)(
  () =>
    __awaiter(void 0, void 0, void 0, function* () {
      try {
        const allTodos = yield db.todo.findMany({});
        const lstOfTodos = [];
        allTodos.forEach((todo) => {
          lstOfTodos.push(todo.todo);
        });
        return lstOfTodos;
      } catch (err) {
        if (err instanceof Error) {
          return err.message;
        }
      }
    }),
  {
    name: "readAllTodos",
    description:
      "This function gives all todos in the response without taking any parameter",
  }
);
const deleteTodo = (0, tools_1.tool)(
  (id) =>
    __awaiter(void 0, void 0, void 0, function* () {
      console.log(`ID entered by gpt ${id}`);
      try {
        const deletedTodo = yield db.todo.delete({
          where: {
            id: parseInt(id),
          },
        });
        return `DeletedTodo: ${deletedTodo.todo}`;
      } catch (err) {
        if (err instanceof Error) {
          return err.message;
        }
      }
    }),
  {
    name: "deleteTodo",
    description:
      "This function delete the todo on the basis of there ID it takes ID as a string then convert that in number and runs the function",
    schema: zod_1.z
      .string()
      .describe(
        "This is an ID of todo which is going to be deleted the ID first comes with a type of string then it get's converted in number to proceed"
      ),
  }
);
const updateTodo = (0, tools_1.tool)(
  (_a) =>
    __awaiter(void 0, [_a], void 0, function* ({ id, newTodo }) {
      try {
        const updatedTodo = yield db.todo.update({
          where: {
            id: parseInt(id),
          },
          data: {
            todo: newTodo,
          },
        });
        return `UpdateTodo: {
        id: ${updatedTodo.id},
        todo: ${updatedTodo.todo}
        }`;
      } catch (err) {
        if (err instanceof Error) {
          return err.message;
        }
      }
    }),
  {
    name: "updateTodo",
    description:
      "This function takes todo ID and newTodo which is going to be updated of the todo ID with the same ID entered and then there todo will get replaced with the newTodo",
    schema: zod_1.z.object({
      id: zod_1.z.string().describe("The unique ID of the todo for finding it"),
      newTodo: zod_1.z
        .string()
        .describe(
          "The new todo which is going to be replaced by the the Unique ID todo's todo"
        ),
    }),
  }
);
const getTodoById = (0, tools_1.tool)(
  (id) =>
    __awaiter(void 0, void 0, void 0, function* () {
      try {
        const findTodoById = yield db.todo.findUnique({
          where: {
            id: parseInt(id),
          },
        });
        return findTodoById
          ? findTodoById
          : `No Todo availabe with the ID ${id}`;
      } catch (err) {
        if (err instanceof Error) {
          return err.message;
        }
      }
    }),
  {
    name: "getTodoById",
    description:
      "This function takes the ID of a todo and find it if Todo is not availabe it simply returns todo is not present with respective id",
    schema: zod_1.z
      .string()
      .describe(
        "This string should be a number with a type string Which will be the ID of the todo"
      ),
  }
);
const tools = [createTodo, listAllTodos, deleteTodo, updateTodo, getTodoById];
const model = new google_genai_1.ChatGoogleGenerativeAI({
  modelName: "gemini-pro",
  maxOutputTokens: 2048,
  apiKey: process.env.GEMINI_API_KEY,
});
function init() {
  return __awaiter(this, void 0, void 0, function* () {
    rl.question("> ", function (prompt) {
      return __awaiter(this, void 0, void 0, function* () {
        if (prompt.toLowerCase() === "exit") {
          rl.close();
          console.log(`You are Exit..
Hope you will be happy with my service 😉✌️`);
          return;
        }
        const checkPoint = new langgraph_1.MemorySaver();
        const agent = (0, prebuilt_1.createReactAgent)({
          llm: model,
          tools,
          checkpointSaver: checkPoint,
        });
        const response = yield agent.invoke(
          {
            messages: [
              {
                role: "system",
                content: `You are helpful Todo AI Assistant. You have ability to createTodo, listAllTodos, deleteTodo, updateTodo, getTodoById these all operations you can do. 
            first take user input
            observer
            If user just say any task so create todo of it in the database use createTodo tool.
            If user sends ID of the todo to delete or just say i have delete this task then you should so and delete that todo related todo from database 
            If user ask you to update so user can send you the ID of the todo or just give you the context of the todo then you have to search the todo in your previous saved data and update it on the basis of updated text
            If user will ask you by taking some context of todo that this context of todo is available or not then you should check in prev todo that the prev todo's includes this words or this todo or not and if anything available send that to user
            
            Example:
            Observing the input
            I have metting on 12pm 
            Calling createTodo function 
            passing parameter I have metting on 12pm
            and after completing the function operation sending the todo ID to user and also saving it
            
            `,
              },
              new messages_1.HumanMessage(prompt),
            ],
          },
          { configurable: { thread_id: "42" } }
        );
        const toolResponse =
          response.messages.find(
            (msg) => msg.constructor.name === "ToolMessage"
          ) || null;
        console.log(
          toolResponse === null || toolResponse === void 0
            ? void 0
            : toolResponse.content
        );
        init();
      });
    });
  });
}
init();
