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
    columns: number;
    jumpBeforeAnchor: boolean;
}

let editors: vscode.TextEditor[] = [];
let blockAnchors: Anchor[] = [];
let wordAnchors: Anchor[] = [];

const settings = (vscode.workspace.getConfiguration('quickJump') as unknown) as Settings;
const anchors = settings.anchors;
const regex = new RegExp(settings.regex, 'g');

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
    const columns = settings.columns;

    for (const editor of vscode.window.visibleTextEditors) {
        if (!editor.viewColumn) continue;

        editor.setDecorations(dimDecorationType, editor.visibleRanges);
        editors.push(editor);

        for (const visualRange of editor.visibleRanges) {
            for (let i = visualRange.start.line; i <= visualRange.end.line; i++) {
                const line = editor.document.lineAt(i);
                const text = line.text.substr(0, columns);

                let match;
                const indexes = [];
                while (match = regex.exec(text)) {
                    indexes.push(match.index);
                }

                for (let j = 0; j < columns; j++) {
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
        case vscode.ViewColumn.One:
            vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
            break;
        case vscode.ViewColumn.Two:
            vscode.commands.executeCommand('workbench.action.focusSecondEditorGroup');
            break;
        case vscode.ViewColumn.Three:
            vscode.commands.executeCommand('workbench.action.focusThirdEditorGroup');
            break;
        case vscode.ViewColumn.Four:
            vscode.commands.executeCommand('workbench.action.focusFourthEditorGroup');
            break;
        case vscode.ViewColumn.Five:
            vscode.commands.executeCommand('workbench.action.focusFifthEditorGroup');
            break;
        case vscode.ViewColumn.Six:
            vscode.commands.executeCommand('workbench.action.focusSixthEditorGroup');
            break;
        case vscode.ViewColumn.Seven:
            vscode.commands.executeCommand('workbench.action.focusSeventhEditorGroup');
            break;
        case vscode.ViewColumn.Eight:
            vscode.commands.executeCommand('workbench.action.focusEighthEditorGroup');
            break;
        default:
            break;
    }
}

function jumpToPosition(editor: vscode.TextEditor, position: vscode.Position) {
    if (settings.jumpBeforeAnchor) {
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
    context.subscriptions.push(vscode.commands.registerCommand('quickJump.jump', async () => {
        try {
            createBlockAnchors();
            if (!blockAnchors.length) return;

            const blockAnchor = await getBlockAnchorSelection();
            if (!blockAnchor) return;

            createWordAnchors(blockAnchor);
            if (!wordAnchors.length) return;

            const wordAnchor = await getWordAnchorSelection();
            if (!wordAnchor) return;

            jumpToAnchor(wordAnchor);
        }
        finally {
            reset();
        }
    }));
}