require("dotenv").config()
const express = require("express")
const app = express()
const fs = require("fs")
const multer = require('multer')
const path = require('path');
const { parseClippings, shiftNotesToHighlights, clippingsToNotionPageObject, processClippings } = require('./utils');

const { Client } = require("@notionhq/client")
const notion = new Client({ auth: process.env.NOTION_KEY })
const upload = multer({ dest: 'uploads/' });

// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public"))
app.use(express.json()) // for parsing application/json

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
    response.sendFile(__dirname + "/public/index2.html")
})

app.post("/k2n", upload.single('file'), async function (request, response) {
    console.log("k2n endpoint called")
    var content

    try {
        // The uploaded file is accessible via request.file
        const filePath = request.file.path;

        // Read the content of the uploaded file
        content = fs.readFileSync(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error("Error reading file:", err);
                return response.status(500).send({ message: "Failed to read file content" });
            }
        });
    } catch (err) {
        console.error("Error:", err);
        response.status(500).send({ message: "Something went wrong" });
    }

    const pageId = process.env.NOTION_PAGE_ID
    var notion_db

    // parse MyClipping.txt content into array of objects
    //TODO Pass file in HTTP request and remove hard-coded file-read
    // const content = fs.readFileSync("./assets/MyClippings.txt", "utf8");
    var clippings = parseClippings(content)
    clippings = shiftNotesToHighlights(clippings)
    var pageList = processClippings(clippings, notion_db.id)

    // create the database, and retrieve the id of it
    try {
        notion_db = await notion.databases.create({
            parent: {
                type: "page_id",
                page_id: pageId,
            },
            title: [
                {
                    type: "text",
                    text: {
                        content: "Notes and Highlights from Kindle",
                    },
                },
            ],
            properties: {
                "Book Title": {
                    title: {},
                },
                Description: {
                    rich_text: {},
                },
                "Cover": {
                    files: {},
                },
            },
        })
    } catch (error) {
        response.json({ message: "error", error })
        return
    }



    try {
        const results = [];
        for (const page of pageList) {
            const grps = [];
            var newPage;
            for (let i = 0; i < page.children.length; i += 100) {
                grps.push(page.children.slice(i, i + 100));
            }
            try {
                newPage = await notion.pages.create({ ...page, children: [] });
                results.push({ page, status: "success" });
            } catch (error) {
                results.push({ page, status: "error", error });
            }
            for (var i = 0; i < grps.length; i++) {
                try {
                    const response = await notion.blocks.children.append({
                        block_id: newPage.id,
                        children:
                            grps[i]
                        ,
                    });
                    results.push({ page, status: "add children success" });
                } catch (error) {
                    throw error(`add children to page failed: ${err.message}`)
                }

            }
        }
        response.json(results);
    } catch (globalError) {
        response.status(500).json({ message: "Unexpected error", error: globalError });
    }

})

// listen for requests :)
const listener = app.listen(process.env.PORT, function () {
    console.log("Your app is listening on port " + listener.address().port)
})

