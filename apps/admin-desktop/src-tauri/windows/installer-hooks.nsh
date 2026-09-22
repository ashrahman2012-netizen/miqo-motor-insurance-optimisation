; Tauri's built-in NSIS silent downgrade check depends on reinstall-page state.
; Enforce the frozen MIQOS downgrade boundary again immediately before file copy.
!macro NSIS_HOOK_PREINSTALL
  ReadRegStr $R8 SHCTX "${UNINSTKEY}" "DisplayVersion"
  ${If} $R8 != ""
    nsis_tauri_utils::SemverCompare "${VERSION}" $R8
    Pop $R9
    ${If} $R9 == -1
      SetErrorLevel 1638
      Abort
    ${EndIf}
  ${EndIf}
!macroend
