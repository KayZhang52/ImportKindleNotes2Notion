
require("dotenv").config()
var obj = {
	"parent": { "page_id": "14377692366480a094ace943c0ded71a" },
  "icon": {
  	"emoji": "🥬"
  },
	"cover": {
		"external": {
			"url": "https://upload.wikimedia.org/wikipedia/commons/6/62/Tuscankale.jpg"
		}
	},
	"properties": {
	},
	"children": [
		{
			"object": "block",
			"type": "heading_2",
			"heading_2": {
				"rich_text": [{ "type": "text", "text": { "content": "Lacinato kale" } }]
			}
		},
		{
			"object": "block",
			"type": "paragraph",
			"paragraph": {
				"rich_text": [
					{
						"type": "text",
						"text": {
							"content": "Lacinato kale is a variety of kale with a long tradition in Italian cuisine, especially that of Tuscany. It is also known as Tuscan kale, Italian kale, dinosaur kale, kale, flat back kale, palm tree kale, or black Tuscan palm.",
							"link": { "url": "https://en.wikipedia.org/wiki/Lacinato_kale" }
						}
					}
				]
			}
		}
	]
}

const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_KEY });

(async () => {
    obj.parent.page_id = process.env.NOTION_PAGE_ID
  const response = await notion.pages.create(obj);
  console.log(response);
})();