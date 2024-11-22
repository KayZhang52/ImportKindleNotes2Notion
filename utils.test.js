const { error } = require('console');
const { parseClippings, shiftNotesToHighlights, processClippings } = require('./utils');
const fs = require("fs")
require("dotenv").config()

const kindleData = `My 60 Memorable Game - Bobby Fischer  
- Your Bookmark on page 303 | Added on Tuesday, August 13, 2024 8:46:54 PM

==========

My 60 Memorable Game - Bobby Fischer  
- Your Bookmark on page 335 | Added on Tuesday, August 13, 2024 9:13:24 PM

==========

My 60 Memorable Game - Bobby Fischer  
- Your Bookmark on page 369 | Added on Tuesday, August 13, 2024 9:19:40 PM

==========`;


function test_testIndividualFieldRegex() {
    lines = [
        "Crime and Punishment (Fyodor Dostoyevsky)\r",
        "- Your Highlight on Location 4302-4302 | Added on Saturday, September 17, 2022 7:01:22 PM\r",
        "Lieutenant Potanchikov,",
    ]

    const titleAuthorMatch = lines[0].replace("\r", "").match(/^(.*?)\s\((.*?)\)?$/);

    const title = titleAuthorMatch ? titleAuthorMatch[1].trim() : null;
    const author = titleAuthorMatch ? titleAuthorMatch[2].trim() : null;

    // Extract the metadata line
    const metadata = lines[1].replace("\r", "");
    const locationMatch = metadata.match(/Location\s(\d+(?:-\d+)?)/);
    const pageMatch = metadata.match(/page\s(\d+(?:-\d+)?)/);
    const dateMatch = metadata.match(/Added on (.+)$/);
    const typeMatch = metadata.match(/Your (\w+)/);

    const location = locationMatch ? locationMatch[1] : null;
    const page = pageMatch ? pageMatch[1] : null;
    const date = dateMatch ? dateMatch[1].trim() : null;
    const type = typeMatch ? typeMatch[1].toLowerCase() : null;

    // Extract the highlight or note text
    const text = lines[2]?.replace("\r", "").trim() || null;

    // console.log({ title, author, location, page, date, type, text })
}

function test2_parseBookmarkClips_NoAuthor() {
    parsedClippings = parseClippings(kindleData)
    parsedClippings.forEach(element => {
        // console.log(element)
    });

}

test('check parsing of single clipping', () => {
    test_testIndividualFieldRegex()
});

test('parse multiple bookmark clippings', () => {
    test2_parseBookmarkClips_NoAuthor()
});

test('parse CrimeAndPunishment Clippings into list of page blocks', () => {
    const content = fs.readFileSync("./assets/Clippings_CrimeAndPunishment.txt", "utf8");
    clippings = parseClippings(content)
    clippings = shiftNotesToHighlights(clippings)
    pageList = processClippings(clippings, "db123")
    // if (pageList.length < 5) throw error("pageList is too small")
    // for (const index in pageList) {
    //     const page = pageList[index]
    //     if(page.children && page.children.length>100){
    //         throw error(`"${page.properties['Book Title'].title[0].text.content}" exceeds max page children(100), has ${page.children.length} children`)
    //     }
    // }
});
