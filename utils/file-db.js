const fs = require("fs").promises;
const path = require("path");

async function readJsonFile(filePath) {
  try {
    const fullPath = path.resolve(filePath);
    const content = await fs.readFile(fullPath, "utf-8");
    return JSON.parse(content || "[]");
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeJsonFile(filePath, data) {
  const fullPath = path.resolve(filePath);
  await fs.writeFile(fullPath, JSON.stringify(data, null, 2), "utf-8");
}

async function appendJsonRecord(filePath, record) {
  const items = await readJsonFile(filePath);
  items.push(record);
  await writeJsonFile(filePath, items);
  return record;
}

module.exports = {
  readJsonFile,
  writeJsonFile,
  appendJsonRecord
};