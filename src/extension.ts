import * as vscode from 'vscode';

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

function createBlockAnchors() {
    for (const editor of vscode.window.visibleTextEditors) {
        if (!editor.viewColumn) {
            continue;
        }

        editors.push(editor);
        for (const visualRange of editor.visibleRanges) {
            for (let i = visualRange.start.line; i <= visualRange.end.line; i++) {
                const line = editor.document.lineAt(i);
                const text = line.text.substr(0, 200);

                let match;
                const indexes = [];
                while (match = regex.exec(text)) {
                    indexes.push(match.index);
                }

                for (let j = 0; j < text.length; j++) {
                    const range = new vscode.Range(i, j, i, j + 1);
                    if (indexes.includes(j)) {
                        const anchor = anchorChars[Math.floor(blockAnchors.length / anchorChars.length)];
                        const decorationType = getBlockAnchorDecorationType(anchor);
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

function createWordAnchors(userSelectedAnchor: string) {
    for (let blockAnchor of blockAnchors) {
        blockAnchor.editor.setDecorations(blockAnchor.decorationType, []);
        if (blockAnchor.anchor === userSelectedAnchor) {
            const anchor = anchorChars[wordAnchors.length];
            const editor = blockAnchor.editor;
            const range = blockAnchor.range;
            const decorationType = getWordAnchorDecorationType(anchor);
            blockAnchor.editor.setDecorations(decorationType, [range]);
            wordAnchors.push({ anchor, editor, range, decorationType });
        }
        else {
            blockAnchor.editor.setDecorations(textDecorationType, [blockAnchor.range]);
        }
    }
}

function jumpToEditor(editor: vscode.TextEditor) {
    const index = editor.viewColumn;
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

function jumpToAnchor(selectedWordAnchor: string) {
    const wordAnchor = wordAnchors.find(x => x.anchor === selectedWordAnchor);
    if (!wordAnchor) return;

    jumpToEditor(wordAnchor.editor);
    jumpToPosition(wordAnchor.editor, wordAnchor.range.end);
}

async function getAnchorSelection(prompt: string) {
    let anchor;
    const cancellationTokenSource = new vscode.CancellationTokenSource();
    await vscode.window.showInputBox(
        {
            prompt: prompt,
            validateInput: (text: string): undefined => {
                if (text.length > 0) {
                    anchor = text[0]
                    cancellationTokenSource.cancel();

                    return;
                }
            }
        }, cancellationTokenSource.token);

    return anchor;
}

async function getBlockAnchorSelection() {
    return getAnchorSelection("Select a block anchor");
}

async function getWordAnchorSelection() {
    return getAnchorSelection("Select a word anchor");
}

function reset() {
    editors.forEach(x => x.setDecorations(textDecorationType, []));
    editors = [];

    blockAnchors.forEach(x => x.editor.setDecorations(x.decorationType, []));
    blockAnchors = [];

    wordAnchors.forEach(x => x.editor.setDecorations(x.decorationType, []));
    wordAnchors = [];
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('quick-jump.jump', async () => {
        try {
            createBlockAnchors();
            if (!blockAnchors.length) return;

            const selectedBlockAnchor = await getBlockAnchorSelection();
            if (!selectedBlockAnchor) return;

            createWordAnchors(selectedBlockAnchor);
            if (!wordAnchors.length) return;

            const selectedWordAnchor = await getWordAnchorSelection();
            if (!selectedWordAnchor) return;

            jumpToAnchor(selectedWordAnchor);
        }
        finally {
            reset();
        }
    }));
}