' LinguasIA - inicia a aplicacao sem abrir nenhuma janela.
' Duplo clique neste arquivo. Os logs ficam em .app.log.
Option Explicit

Dim shell, fso, root, cmd, code

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = root

cmd = "node """ & root & "\scripts\app-start.js"""

' 0 = janela oculta; True = espera o script terminar para checar o resultado
code = shell.Run(cmd, 0, True)

If code <> 0 Then
    MsgBox "Nao foi possivel iniciar o LinguasIA." & vbCrLf & _
           "Veja os detalhes em .app.log", vbCritical, "LinguasIA"
End If
