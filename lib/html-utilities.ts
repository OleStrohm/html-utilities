import { CompositeDisposable } from 'atom';

declare global {
    namespace AtomCore {
        interface Pane {
            getActiveEditor(): TextEditor;
        }
    }
    interface String {
        startsWith(str): boolean;
    }
}

export default class HTMLUtilities {

    subscriptions = null;
    editor = null;

    activate(state) {
        this.subscriptions = new CompositeDisposable();
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'html-utilities:equalquotes': () => this.equalquotes()
        }));

        var __this = this;

        this.subscriptions.add(atom.workspace.observeTextEditors(function(editor) {
            var editorView = atom.views.getView(editor);
            editorView.addEventListener('keydown', function(e) {
                if(!(e.altKey || e.ctrlKey)) {
                    __this.parallellEdit(e.key);
                }
            });
        }))
    }

    public equalquotes(): void {
        var editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            return;
        }
        editor.insertText('=');
        if(!atom.config.get("html-utilities.actions.equalquotes"))
        return;

        var cursorPos = editor.getCursorBufferPosition();
        var lines = editor.getBuffer().getLines();
        var row:number = 0, column:number = 0;
        var inTag = false;
        var inText = false;
        while(row < cursorPos.row || (row == cursorPos.row && column < cursorPos.column)) {
            if(lines[row].charAt(column) == "\\") {
                column++;
                if (column > lines[row].length) {
                    row++;
                    column = 0;
                }
            } else {
                if (lines[row].charAt(column) == "\"") {
                    inText = !inText;
                }
                if(!inText) {
                    if (lines[row].charAt(column) == "<") {
                        inTag = true;
                    }
                    if (lines[row].charAt(column) == ">") {
                        inTag = false;
                    }
                }
            }

            column++;
            if (column > lines[row].length) {
                row++;
                column = 0;
            }
        }
        if(inTag && !inText) {
            editor.setCursorBufferPosition([cursorPos.row, cursorPos.column]);
            editor.insertText('\"\"');
            cursorPos.column++;
            editor.setCursorBufferPosition(cursorPos);
        }
    }

    public parallellEdit(char): void {
        var tags = [];

        var editor = atom.workspace.getActiveTextEditor();
        if (!editor || !(<any>editor.getGrammar().name.toUpperCase().trim()).startsWith("HTML")) {
            return;
        }

        if(!atom.config.get("html-utilities.actions.parallellEdit"))
        return;

        var cursorPos = editor.getCursorBufferPosition();
        var lines = editor.getBuffer().getLines();
        var row:number = 0, column:number = 0;
        let tagStart = null;
        var inTag = false;
        var inText = false;
        while(row < lines.length && column <= lines[row].length) {
            if(lines[row].charAt(column) == "\\") {
                if(row == cursorPos.row && column == cursorPos.column && !inTag) {
                    return;
                }
                column++;
                if (column > lines[row].length) {
                    row++;
                    column = 0;
                }
            } else {
                if(!inText) {
                    if (column > 0 && lines[row].charAt(column-1) == "<") {
                        if(tagStart != null) {
                            return;
                        }
                        inTag = true;
                        tagStart = new TextPosition(row, column);
                    }
                    if (column > 0 && lines[row].charAt(column-1) == ">") {
                        if(tagStart == null) {
                            return;
                        }
                        inTag = false;
                        let text = lines[row].substring(tagStart.column, column-1).split(" ")[0];
                        let tagEnd = new TextPosition(tagStart.row, tagStart.column + text.length);
                        if(text.startsWith("/")) {
                            tagStart.column++;
                        }
                        tags.push(new HTMLTag(text, tagStart, tagEnd));
                        tagStart = null;
                    }
                }
                if (lines[row].charAt(column) == '"') {
                    inText = !inText;
                }
            }
            if(row == cursorPos.row && column == cursorPos.column && !inTag) {
                return;
            }

            column++;
            if (column > lines[row].length) {
                row++;
                column = 0;
            }
        }


        var tagPairs = [];
        var tagStack = [];

        for(let i = 0; i < tags.length; i++) {
            let tag: HTMLTag = tags[i];
            if(tag.text.startsWith("/")) {
                let pairedTag = null;
                while(pairedTag == null && tagStack.length > 0) {
                    pairedTag = tagStack.pop();
                    if(pairedTag.text != tag.text.substr(1)) {
                        pairedTag = null;
                    }
                }
                if(pairedTag == null) {
                    return;
                }
                tagPairs.push([pairedTag, tag]);
            } else {
                tagStack.push(tag);
            }
        }

        for(let i = 0; i < tagPairs.length; i++) {
            if(tagPairs[i][0].isInside(cursorPos)) {
                editor.setCursorBufferPosition([tagPairs[i][1].start.row, tagPairs[i][1].start.column + cursorPos.column - tagPairs[i][0].start.column]);
                if(char.length == 1 && char != " ") {
                    editor.insertText(char);
                } else if(char == "Backspace") {
                    var curCursorPos = editor.getCursorBufferPosition();
                    editor.setTextInBufferRange([[curCursorPos.row,curCursorPos.column-1],[curCursorPos.row,curCursorPos.column]], "");
                }
                editor.setCursorBufferPosition(cursorPos);
            } else if(tagPairs[i][1].isInside(cursorPos)) {
                editor.setCursorBufferPosition([tagPairs[i][0].start.row, tagPairs[i][0].start.column + cursorPos.column - tagPairs[i][1].start.column]);
                if(char.length == 1 && char != " ") {
                    editor.insertText(char);
                    if(tagPairs[i][0].start.row == cursorPos.row) {
                        cursorPos.column++;
                    }
                } else if(char == "Backspace") {
                    var curCursorPos = editor.getCursorBufferPosition();
                    editor.setTextInBufferRange([[curCursorPos.row,curCursorPos.column-1],[curCursorPos.row,curCursorPos.column]], "");
                    if(tagPairs[i][0].start.row == cursorPos.row) {
                        cursorPos.column--;
                    }
                }

                editor.setCursorBufferPosition(cursorPos);
            }
        }
    }

    deactivate() {}

    serialize() {}

    deserialize() {}

}

class HTMLTag {
    text: any;
    start: TextPosition;
    end: TextPosition;

    constructor(text: String, start: TextPosition, end: TextPosition) {
        this.text = text;
        this.start = start;
        this.end = end;
    }

    public isInside(pos): boolean {
        return (pos.row > this.start.row && pos.row < this.end.row) ||
        (this.start.row != this.end.row && pos.row == this.start.row && pos.column >= this.start.column) ||
        (this.start.row != this.end.row && pos.row == this.end.row && pos.column <= this.end.column) ||
        (this.start.row == this.end.row && pos.row == this.start.row && pos.column >= this.start.column && pos.column <= this.end.column);
    }
}

class TextPosition {
    row = 0;
    column = 0;

    constructor(row, column) {
        this.row = row;
        this.column = column;
    }
}
