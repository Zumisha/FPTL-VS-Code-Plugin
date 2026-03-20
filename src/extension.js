const vscode = require('vscode');
const { exec } = require('child_process')
const os = require('os')

const extensionPath = vscode.extensions.getExtension("somename.fptl").extensionPath;
const collection = vscode.languages.createDiagnosticCollection('Diagnostics');

function activate(context) {
    runCommand = vscode.commands.registerCommand('extension.runFptl', runFptl);
    infoCommand = vscode.commands.registerCommand('extension.infoFptl', showInfo);

    hovers = vscode.languages.registerHoverProvider(
        {
            scheme: 'file', language: 'fptl'
        },
        {
            provideHover: createHovers
        }
    );

    const runButton = vscode.window.createStatusBarItem(1, 1);
    runButton.text = "$(triangle-right) Run (FPTL)";
    runButton.color = 'red';
    runButton.tooltip = 'Run current FPTL file';
    runButton.command = 'extension.runFptl';
    runButton.show();

    context.subscriptions.push(runCommand);
    context.subscriptions.push(infoCommand);
    context.subscriptions.push(hovers);
    context.subscriptions.push(runButton);

    vscode.window.showInformationMessage("FPTL-support: Activated");
}

function updateDiagnostics(document, collection, errorRange, errorMessage) {
    collection.set(document.uri, [{
        code: '',
        message: 'Error while running',
        range: errorRange,
        severity: vscode.DiagnosticSeverity.Error,
        source: '',
        relatedInformation: [
            new vscode.DiagnosticRelatedInformation(new vscode.Location(document.uri, errorRange), errorMessage)
        ]
    }]);
}

async function showInfo() {
    try {
        vscode.workspace.openTextDocument(`${extensionPath}/src/info/info.fptl`)
            .then(doc => vscode.window.showTextDocument(doc));
    } catch (err) {
        console.log(err);
        vscode.window.showErrorMessage(err);
    }
}

async function runFptl() {
    try {
        if (os.type().includes('Windows')) {
            const editor = vscode.window.activeTextEditor;

            if (!editor) {
                return;
            }

            const executionParams = await vscode.window.showInputBox({
                prompt: "execution params",
                value: "-n 8 -v -i -t",
                valueSelection: [3, 4]
            });

            if (executionParams) {
                const command = `${extensionPath}/src/run/fptl/fptl.exe ${editor.document.fileName} ${executionParams}`;
                vscode.window.showInformationMessage("Running...");
                exec(`${command}`, [], (error, stdout, stderr) => {
                    if (stdout) {
                        const errorStr = "Error :";
                        if (stdout.includes(errorStr)) {
                            vscode.window.showErrorMessage("An error occured while running...");

                            let lineRange = editor.document
                                .lineAt(+stdout.substring(stdout.indexOf("line") + 4, stdout.indexOf("ch")) - 1).range;

                            updateDiagnostics(vscode.window.activeTextEditor.document, collection, lineRange,
                                stdout.substring(stdout.indexOf(errorStr)));

                            editor.selection = new vscode.Selection(lineRange.end, lineRange.end);
                            editor.revealRange(lineRange);
                        } else {
                            collection.clear();
                        }

                        if (vscode.window.visibleTextEditors.length == 1) {
                            vscode.commands.executeCommand('workbench.action.editorLayoutTwoRows');
                        }

                        vscode.workspace.openTextDocument({ content: stdout })
                            .then(doc => vscode.window.showTextDocument(doc, 2, true));
                        vscode.window.showInformationMessage("Finished");
                    }
                    else {
                        console.log(stderr);
                        vscode.window.showErrorMessage(stderr);
                    }
                });
            }
        } else {
            vscode.window.showInformationMessage("Not enabled fot this OS type yet.");
        }
    } catch (err) {
        console.log(err);
        vscode.window.showErrorMessage(err);
    }
}

function createHovers(document, position, token) {
    const range = document.getWordRangeAtPosition(position);
    const word = document.getText(range);

    if (word == "tupleLen") {
        return {
            contents: [
                {
                    value: "Возвращает длину кортежа n"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * ... * [n]).tupleLen" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "id") {
        return {
            contents: [
                {
                    value: "Возвращает входной кортеж"
                },
                {
                    value:
                        "```fptl\n" +
                        "id" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "not") {
        return {
            contents: [
                {
                    value: "Логическое отрициние"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1]).not" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "and") {
        return {
            contents: [
                {
                    value: "Логическиое \"И\". Вычисляются и [1] и [2]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * [2]).and" +
                        "\n```"
                },
                {
                    value: "Если критично, использовать конструкцию ([1] -> [2]) ->"
                }
            ]
        }
    }

    if (word == "or") {
        return {
            contents: [
                {
                    value: "Логическиое \"ИЛИ\". Вычисляются и [1] и [2]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * [2]).or" +
                        "\n```"
                },
                {
                    value: "Если критично, использовать конструкцию ([1].not -> [2], true) ->"
                }
            ]
        }
    }

    if (word == "xor") {
        return {
            contents: [
                {
                    value: "Исключающее \"ИЛИ\""
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * [2]).xor" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "equal") {
        return {
            contents: [
                {
                    value: "Функция проверки равенства [1] и [2]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * [2]).equal" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "nequal") {
        return {
            contents: [
                {
                    value: "Функция проверки неравенства [1] и [2]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * [2]).nequal" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "greater") {
        return {
            contents: [
                {
                    value: "Функция проверки условия [1] > [2]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * [2]).greater" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "less") {
        return {
            contents: [
                {
                    value: "Функция проверки условия [1] < [2]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * [2]).less" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "gequal") {
        return {
            contents: [
                {
                    value: "Функция проверки условия [1] >= [2]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * [2]).gequal" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "lequal") {
        return {
            contents: [
                {
                    value: "Функция проверки условия [1] <= [2]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * [2]).lequal" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "add") {
        return {
            contents: [
                {
                    value: "Возвращает результат сложения [1] и [2]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * [2]).add" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "sub") {
        return {
            contents: [
                {
                    value: "Возвращает результат вычитания [2] из [1]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * [2]).sub" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "mul") {
        return {
            contents: [
                {
                    value: "Возвращает результат умножения [1] на [2]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * [2]).mul" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "div") {
        return {
            contents: [
                {
                    value: "Возвращает результат деления [1] на [2]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * [2]).div" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "mod") {
        return {
            contents: [
                {
                    value: "Возвращает результат деления [1] по модулю [2]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * [2]).mod" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "abs") {
        return {
            contents: [
                {
                    value: "Возвращает абсолютное значение [1]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1]).abs" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "sqrt") {
        return {
            contents: [
                {
                    value: "Возвращает результат вычисления квадратного корня от [1]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1]).sqrt" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "exp") {
        return {
            contents: [
                {
                    value: "Возвращает результат возведение экспоненты в степень [1]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1]).exp" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "ln") {
        return {
            contents: [
                {
                    value: "Возвращает результат взятия натурального логарифма от [1]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1]).ln" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "round") {
        return {
            contents: [
                {
                    value: "Математическое округление"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1]).round" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "sin") {
        return {
            contents: [
                {
                    value: "Возвращает результат вычисления sin([1])"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1]).sin" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "cos") {
        return {
            contents: [
                {
                    value: "Возвращает результат вычисления cos([1])"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1]).cos" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "tan") {
        return {
            contents: [
                {
                    value: "Возвращает результат вычисления tan([1])"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1]).tan" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "asin") {
        return {
            contents: [
                {
                    value: "Возвращает результат вычисления asin([1])"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1]).asin" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "atan") {
        return {
            contents: [
                {
                    value: "Возвращает результат вычисления atan([1])"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1]).atan" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "Pi") {
        return {
            contents: [
                {
                    value: "Возвращает число Пи"
                },
                {
                    value:
                        "```fptl\n" +
                        "" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "E") {
        return {
            contents: [
                {
                    value: "Возвращает основание натурального логарифма"
                },
                {
                    value:
                        "```fptl\n" +
                        "" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "rand") {
        return {
            contents: [
                {
                    value: "Возвращает случайное вещественное число в диапазоне от 0 до 1"
                },
                {
                    value:
                        "```fptl\n" +
                        "" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "toString") {
        return {
            contents: [
                {
                    value: "Возвращает результат приведения [1] к строке"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1]).toString" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "toInt") {
        return {
            contents: [
                {
                    value: "Возвращает результат приведения [1] к целому 32-х битному числу со знаком"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1]).toInt" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "toReal") {
        return {
            contents: [
                {
                    value: "Возвращает результат приведения [1] к вещественному числу двойной точности"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1]).toReal" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "cat") {
        return {
            contents: [
                {
                    value: "Возвращает объединение строк [1]-[n]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * ... * [n]).cat" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "search") {
        return {
            contents: [
                {
                    value: "Поиск в строке [1] по регулярному выражению [2]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * [2]).search" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "match") {
        return {
            contents: [
                {
                    value: "Возвращает все подстроки строки [1] соответствующие регулярному выражению [2]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * [2]).match" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "replace") {
        return {
            contents: [
                {
                    value: "Замена в строке [1] по регулярному выражению [2]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * [2]).replace" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "getToken") {
        return {
            contents: [
                {
                    value: "Выделение с начала строки [1] лексемы соответствующей регулярному выражению [2] Возвращает выделенную лексему и идущую после неё часть строки или \"undefined\", если начало строки [1] не соответствует шаблону [2]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * [2]).getToken" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "length") {
        return {
            contents: [
                {
                    value: "Возвращает длину строки [1]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1]).length" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "print") {
        return {
            contents: [
                {
                    value: "Выводит в консоль элемент или кортеж элементов"
                },
                {
                    value:
                        "```fptl\n" +
                        "" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "printType") {
        return {
            contents: [
                {
                    value: "Выводит в консоль тип элемента или кортеж типов элементов кортежа"
                },
                {
                    value:
                        "```fptl\n" +
                        "" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "readFile") {
        return {
            contents: [
                {
                    value: "Считавает файл по пути [1] в строку и возвращает её В случае неудачи возвращает undefined"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1]).readFile" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "createFile") {
        return {
            contents: [
                {
                    value: "Создать или очистить файл по пути [2] и записать в него значение [1] Снимает атрибут \"только чтение\" В случае успеха возвращает true, иначе false"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * [2]).createFile" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "appendFile") {
        return {
            contents: [
                {
                    value: "Записать значение [1] в конец файла по пути [2] Снимает атрибут \"только чтение\" В случае успеха возвращает true, иначе false"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * [2]).appendFile" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "arrayCreate") {
        return {
            contents: [
                {
                    value: "Возвращает массив из [1] элементов, заполненный значениями [2]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * [2]).arrayCreate" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "arrayGet") {
        return {
            contents: [
                {
                    value: "Получить из массива [1] элемент с индексом [2]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * [2]).arrayGet" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "arraySet") {
        return {
            contents: [
                {
                    value: "В массиве [1] присвоить элементу с индексом [2] значение [3] Возвращает изменённый массив [1]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * [2] * [3]).arraySet" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "arrayLen") {
        return {
            contents: [
                {
                    value: "Возвращает длину массива [1]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1]).arrayLen" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "arrayCat") {
        return {
            contents: [
                {
                    value: "Возвращает объединение массивов [1]-[n]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * ... * [n]).arrayCat" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "arrayCopy") {
        return {
            contents: [
                {
                    value: "Возвращает объединение массивов [1]-[n]"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1]).arrayCopy" +
                        "\n```"
                }
            ]
        }
    }

    if (word == "arrayFromFile") {
        return {
            contents: [
                {
                    value: "Попытаться заполнить массив [1] значениями из файла по пути [2], если не вышло, вернёт undefined"
                },
                {
                    value:
                        "```fptl\n" +
                        "([1] * [2]).arrayFromFile" +
                        "\n```"
                }
            ]
        }
    }
}

function deactivate() {
}

module.exports = {
    activate,
    deactivate
}