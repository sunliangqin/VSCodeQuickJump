import * as vscode from 'vscode';

interface Anchor {
    name: string;
    editor: vscode.TextEditor;
    range: vscode.Range;
    decorationType: vscode.TextEditorDecorationType
}

interface Settings {
    anchors: string;
    regex: string;
    textColor: string;
    blockAnchorColor: string;
    wordAnchorColor: string;
    jumpBeforeAnchor: string;
}

let editors: vscode.TextEditor[] = [];
let blockAnchors: Anchor[] = [];
let wordAnchors: Anchor[] = [];

let settings = (vscode.workspace.getConfiguration('quickJump') as unknown) as Settings;
const anchors: string = settings.anchors;
const regex: RegExp = new RegExp(settings.regex, 'g');
const dimDecorationType = vscode.window.createTextEditorDecorationType({
    color: settings.textColor
});

function getBlockAnchorDecorationType(name: string) {
    return vscode.window.createTextEditorDecorationType({
        opacity: '0',
        before: {
            contentText: name,
            fontWeight: 'bold',
            color: settings.blockAnchorColor,
            margin: '0 -1ch 0 0; position: absolute;'
        }
    });
}

function createBlockAnchors() {
    for (const editor of vscode.window.visibleTextEditors) {
        if (!editor.viewColumn) continue;

        editors.push(editor);
        for (const visualRange of editor.visibleRanges) {
            editor.setDecorations(dimDecorationType, [visualRange]);
            for (let i = visualRange.start.line; i <= visualRange.end.line; i++) {
                const line = editor.document.lineAt(i);
                const text = line.text.substr(0, 500);

                let match;
                const indexes = [];
                while (match = regex.exec(text)) {
                    indexes.push(match.index);
                }

                for (let j = 0; j < text.length; j++) {
                    const range = new vscode.Range(i, j, i, j + 1);
                    if (indexes.includes(j)) {
                        const name = anchors[Math.floor(blockAnchors.length / anchors.length)];
                        const decorationType = getBlockAnchorDecorationType(name);
                        editor.setDecorations(decorationType, [range]);

                        blockAnchors.push({ name, editor, range, decorationType });
                    }
                }
            }
        }
    }
}

function getWordAnchorDecorationType(name: string) {
    return vscode.window.createTextEditorDecorationType({
        opacity: '0',
        before: {
            contentText: name,
            fontWeight: 'bold',
            color: settings.wordAnchorColor,
            margin: '0 -1ch 0 0; position: absolute;',
        }
    });
}

function createWordAnchors(name: string) {
    for (const blockAnchor of blockAnchors) {
        blockAnchor.editor.setDecorations(blockAnchor.decorationType, []);
        if (blockAnchor.name === name) {
            const name = anchors[wordAnchors.length];
            const editor = blockAnchor.editor;
            const range = blockAnchor.range;
            const decorationType = getWordAnchorDecorationType(name);
            blockAnchor.editor.setDecorations(decorationType, [range]);
            wordAnchors.push({ name, editor, range, decorationType });
        }
    }
}

async function getAnchorSelection(prompt: string) {
    let name;
    const cancellation = new vscode.CancellationTokenSource();
    await vscode.window.showInputBox(
        {
            prompt: prompt,
            validateInput: (text: string): undefined => {
                if (text.length > 0) {
                    name = text[0]
                    cancellation.cancel();

                    return;
                }
            }
        }, cancellation.token);

    return name;
}

async function getBlockAnchorSelection() {
    return getAnchorSelection('Select a block anchor');
}

async function getWordAnchorSelection() {
    return getAnchorSelection('Select a word anchor');
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
    if (settings.jumpBeforeAnchor.toLowerCase() === 'true') {
        position = new vscode.Position(position.line, position.character - 1)
    }
    editor.selection = new vscode.Selection(position, position);
}

function jumpToAnchor(name: string) {
    const wordAnchor = wordAnchors.find(x => x.name === name);
    if (!wordAnchor) return;

    jumpToEditor(wordAnchor.editor);
    jumpToPosition(wordAnchor.editor, wordAnchor.range.end);
}

function reset() {
    editors.forEach(x => x.setDecorations(dimDecorationType, []));
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

            const blockAnchor = await getBlockAnchorSelection();
            if (!blockAnchor) return;

            createWordAnchors(blockAnchor);
            if (!wordAnchors.length) return;

            const wordAnchor= await getWordAnchorSelection();
            if (!wordAnchor) return;

            jumpToAnchor(wordAnchor);
        }
        finally {
            reset();
        }
    }));
}