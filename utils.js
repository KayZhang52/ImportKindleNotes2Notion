const { getPage } = require("@notionhq/client/build/src/api-endpoints");
require("dotenv").config()

/**
 * @typedef {Object} Clipping
 * @property {string} title - The title of the book.
 * @property {string} author - The author of the book.
 * @property {string|number} location - The location of the clipping in the book (e.g., Kindle location or chapter).
 * @property {string|number} [page] - The page number of the clipping (if available).
 * @property {string} date - The date the clipping was created.
 * @property {string} type - The type of clipping (e.g., "highlight", "note").
 * @property {string} text - The content of the clipping.
 * @property {string} note - The note reader left on a highlight in the book.
 */


/**
 * Parse content into an array of Clipping objects.
 * @param {string} content - The string content of MyClippings.txt.
 * @returns {Clipping}
 */
function parseClippings(content) {
    // Split content into individual entries by the separator
    const entries = content.split("==========").filter(entry => entry.trim() !== "");

    return entries.map(entry => {
        content = content.replace("\r", "");
        const lines = entry.trim().split("\n").filter(line => line.trim() !== "");

        // highlight, notes and bookmarks all have min 2 lines.
        if (lines.length < 2) {
            throw new Error(`Clips should never have less than 2 lines. Current lines: ${JSON.stringify(lines)}`);
        }

        // nested subgroup needed to handle books without authors.
        const titleAuthorMatch = lines[0].replace("\r", "").match(/^(.*?)\s(\((.*?)\))?$/);
        const title = titleAuthorMatch ? titleAuthorMatch[1].trim() : null;
        const author = titleAuthorMatch ? titleAuthorMatch[3] ? titleAuthorMatch[3].trim() : null : null;

        // Extract the metadata line
        const metadata = lines[1].replace("\r", "");
        const locationMatch = metadata.match(/Location\s(\d+(?:-\d+)?)/);
        const pageMatch = metadata.match(/page\s(\d+(?:-\d+)?)/);
        const dateMatch = metadata.match(/Added on (.+)$/);
        const typeMatch = metadata.match(/Your (\w+)/);

        // extract location and date
        const location = locationMatch ? locationMatch[1] : null;
        const page = pageMatch ? pageMatch[1] : null;
        const date = dateMatch ? dateMatch[1].trim() : null;
        const type = typeMatch ? typeMatch[1].toLowerCase() : null;

        // Extract the highlight or note text
        var text = null;
        if (lines.length >= 3 && lines[2]) {
            text = lines[2].replace("\r", "").trim()
        }

        return { title, author, location, page, date, type, text };
    }).filter(Boolean); // Remove null entries
}

/**
 * 
 * Use with an array of clipping objects, find all the notes, 
 * and put them in the 'notes' field of corresponding highlight.
 * @param {Clipping[]} clippings - An array of clipping objects.
 * @returns {Clipping[]} The processed clipping array where the notes are merged into the highlights.
 */
function shiftNotesToHighlights(clippings) {
    // swap the notes and highlights that are in reversed order
    for (var i = 0; i < clippings.length - 1; i++) {
        var cur = clippings[i]
        var next = clippings[i + 1]
        if (cur.type == 'note' && next.type == 'highlight' && cur.date == next.date) {
            [clippings[i], clippings[i + 1]] = [clippings[i + 1], clippings[i]];
        }
    }
    // add the notes to the correspoinding highlights
    for (var i = 1; i < clippings.length; i++) {
        var cur = clippings[i]
        var prev = clippings[i - 1]
        if (cur.type == 'note' && prev.type == 'highlight') {
            prev['note'] = cur.text
        }
    }
    // remove all notes and bookmarks
    return clippings.filter(obj => obj.type !== "bookmark" && obj.type !== "note");
}

function getPageString(clipping) {
    if (clipping.page) {
        return `(page ${clipping.page})`
    } else if (clipping.location) {
        return `(location ${clipping.location})`
    } else return ""
}


/**
 * Generate an array of notion-block objects for each book to be added to the notion database.
 * @param {Clipping[]} clippings - the processed clipping array
 * @param {string} db_id - the notion database id
 * @returns {Object[]} An array of notion blocks
 * */ 
function processClippings(clippings, db_id) {
    if (clippings.length == 0) return;
    const bookMap = new Map();
    clippings.forEach(clipping => {
        const title = clipping["title"];
        if (!bookMap.has(title)) {
            bookMap.set(title, []);
        }
        bookMap.get(title).push(clipping);
    });
    var pageList = []
    for (const [title, clippings] of bookMap) {
        var noteCount = 0
        pageObject = {
            parent: {
                type: "database_id",
                database_id: db_id,
            },
            properties: {
                "Book Title": {
                    title: [{
                        text: {
                            "content": title
                        }
                    },]
                },
            },
            children: []
        }
        clippings.forEach(clipping => {
            var quote
            if (clipping.note) {
                noteCount++
                quote = {
                    "type": "callout",
                    "callout": {
                        "rich_text": [
                            // the highlighted quote itself
                            {
                                "text": {
                                    "content": clipping.text
                                }
                            },
                            {
                                "type": "text",
                                "text": {
                                    "content": getPageString(clipping)
                                }
                            }
                        ],
                        // the note
                        "children": [
                            {
                                "type": "divider",
                                "divider": {}
                            },
                            {
                                "type": "paragraph",
                                "paragraph": {
                                    "rich_text": [
                                        {
                                            "type": "text",
                                            "text": {
                                                "content": clipping.note ? clipping.note : ""
                                            }
                                        },

                                    ]
                                }

                            }
                        ],
                        "icon": {
                            "emoji": "🗒️"
                        }
                    }
                }
            } else {
                quote = {
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [
                            // icon
                            {
                                "text": {
                                    "content": "📎"
                                }
                            },
                            // the highlighted quote itself
                            {
                                "text": {
                                    "content": clipping.text
                                }
                            },
                            // page or location of quote
                            {
                                "text": {
                                    "content": getPageString(clipping)
                                }
                            },
                        ],
                    }
                }
            }
            pageObject.children.push(quote);
        })
        console.log(`"${title}" has ${pageObject.children.length} highlights, ${noteCount} with notes`)
        pageList.push(pageObject)
    }
    return pageList
}

module.exports = { parseClippings, shiftNotesToHighlights, processClippings };