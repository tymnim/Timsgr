
const { app, BrowserWindow } = require('electron')

let mainWindow

function createWindow () {

    mainWindow = new BrowserWindow({
        width: 935, 
        height: 630, 

        minWidth: 400, 
        minHeight: 400, 
        title: "Timsgr",
		webPreferences: {
        	nodeIntegration: true
     	},
    })


    mainWindow.loadFile("index.html")

    //mainWindow.webContents.openDevTools()

    mainWindow.on("closed", function () {
        mainWindow = null
    })
}

app.on("ready", createWindow)

// Quit when all windows are closed.
app.on("window-all-closed", function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") {
        app.quit()
    }
})

app.on("activate", function () {
    // On OS X it"s common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
})

// Ignores all security error cause by problematic certificates
app.commandLine.appendSwitch("ignore-certificate-errors")





