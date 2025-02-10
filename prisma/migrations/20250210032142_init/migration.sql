/*
  Warnings:

  - A unique constraint covering the columns `[todo]` on the table `todo` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "todo_todo_key" ON "todo"("todo");
