import * as vscode from 'vscode';

enum Mode {
    None,
    Block,
    Word
}

interface Anchor {
    anchor: string;
    editor: vscode.TextEditor;
    range: vscode.Range;
    decorationType: vscode.TextEditorDecorationType
}

const anchorChars: string = 'hklyuiopnm,qwertzxcvbasdgjf;0123456789/';
const regex: RegExp = new RegExp('\\b\\w|\\w\\b|\\w(?=_)|(?<=_)\\w|(?<=[a-z0-9])[A-Z]', 'g');
const textDecorationType = vscode.window.createTextEditorDecorationType({
    color: '#777777'
});

let mode = Mode.Block;
let editors: vscode.TextEditor[] = [];
let blockAnchors: Anchor[] = [];
let wordAnchors: Anchor[] = [];

function getBlockAnchorDecorationType(content: string) {
    return vscode.window.createTextEditorDecorationType({
        color: 'transparent',
        before: {
            contentText: content,
            fontWeight: 'bold',
            color: '#ffb400',
            backgroundColor: '#0000',
            margin: '0 -1ch 0 0; position: absolute;',
            height: '100%'
        }
    });
}

function getWordAnchorDecorationType(content: string) {
    return vscode.window.createTextEditorDecorationType({
        color: 'transparent',
        before: {
            contentText: content,
            fontWeight: 'bold',
            color: '#ff0000',
            backgroundColor: '#0000',
            margin: '0 -1ch 0 0; position: absolute;',
            height: '100%'
        }
    });
}
function createBlockAnchors() {
    for (let editor of vscode.window.visibleTextEditors) {
        if (!editor.viewColumn) {
            continue;
        }

        editors.push(editor);
        for (let visualRange of editor.visibleRanges) {
            for (let i = visualRange.start.line; i <= visualRange.end.line; i++) {
                let line = editor.document.lineAt(i);
                let text = line.text.substr(0, 200);

                let match;
                let indexes = [];
                while (match = regex.exec(text)) {
                    indexes.push(match.index);
                }

                for (let j = 0; j < text.length; j++) {
                    let range = new vscode.Range(i, j, i, j + 1);
                    if (indexes.includes(j)) {
                        let anchor = anchorChars[Math.floor(blockAnchors.length / anchorChars.length)];
                        let decorationType = getBlockAnchorDecorationType(anchor);
                        editor.setDecorations(decorationType, [range]);

                        blockAnchors.push({ anchor, editor, range, decorationType });
                    }
                    else {
                        editor.setDecorations(textDecorationType, [range]);
                    }
                }
            }
        }
    }
}

function createWordAnchors(userSelectedAnchor: string) {
    for (let blockAnchor of blockAnchors) {
        blockAnchor.editor.setDecorations(blockAnchor.decorationType, []);
        if (blockAnchor.anchor === userSelectedAnchor) {
            let anchor = anchorChars[wordAnchors.length];
            let editor = blockAnchor.editor;
            let range = blockAnchor.range;
            let decorationType = getWordAnchorDecorationType(anchor);
            blockAnchor.editor.setDecorations(decorationType, [range]);
            wordAnchors.push({ anchor, editor, range, decorationType });
        }
        else {
            blockAnchor.editor.setDecorations(textDecorationType, [blockAnchor.range]);
        }
    }
}

function reset() {
    mode = Mode.None;

    editors.forEach(x => x.setDecorations(textDecorationType, []));
    editors = [];

    blockAnchors.forEach(x => x.editor.setDecorations(x.decorationType, []));
    blockAnchors = [];

    wordAnchors.forEach(x => x.editor.setDecorations(x.decorationType, []));
    wordAnchors = [];
}

function jumpToEditor(editor: vscode.TextEditor) {
    let index = editor.viewColumn;
    switch (index) {
        case 1:
            vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
            break;
        case 2:
            vscode.commands.executeCommand('workbench.action.focusSecondEditorGroup');
            break;
        case 3:
            vscode.commands.executeCommand('workbench.action.focusThirdEditorGroup');
            break;
        case 4:
            vscode.commands.executeCommand('workbench.action.focusFourthEditorGroup');
            break;
        case 5:
            vscode.commands.executeCommand('workbench.action.focusFifthEditorGroup');
            break;
        case 6:
            vscode.commands.executeCommand('workbench.action.focusSixthEditorGroup');
            break;
        case 7:
            vscode.commands.executeCommand('workbench.action.focusSeventhEditorGroup');
            break;
        case 8:
            vscode.commands.executeCommand('workbench.action.focusEighthEditorGroup');
            break;
        default:
            break;
    }
}

function jumpToPosition(editor: vscode.TextEditor, position: vscode.Position) {
    editor.selection = new vscode.Selection(position, position);
}

function jump(editor: vscode.TextEditor, range: vscode.Range) {
    jumpToEditor(editor);
    jumpToPosition(editor, range.end);
}

function waitForSelection() {
    mode = Mode.Block;

    let disposable = vscode.commands.registerTextEditorCommand('type',
        (_editor: vscode.TextEditor, _edit: vscode.TextEditorEdit, type: { text: string }) => {
            let userSelectedAnchor = type.text[0];
            if (!anchorChars.includes(userSelectedAnchor)) {
                disposable.dispose();
                reset();

                return;
            }

            if (mode === Mode.Block) {
                createWordAnchors(userSelectedAnchor);
                mode = Mode.Word;
            } else if (mode === Mode.Word) {
                let wordAnchor = wordAnchors.find(x => x.anchor === userSelectedAnchor);
                if (wordAnchor) {
                    jump(wordAnchor.editor, wordAnchor.range);
                }

                disposable.dispose();
                reset();
            }
        });
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('quick-jump.jump', () => {
        reset();
        createBlockAnchors();
        waitForSelection();
    }));
}