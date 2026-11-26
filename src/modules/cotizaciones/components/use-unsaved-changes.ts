"use client";
import { useEffect } from "react";
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    function unload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    function logout(e: SubmitEvent) {
      if (
        e.target instanceof HTMLFormElement &&
        e.target.closest("header") &&
        !window.confirm("¿Cerrar sesión y descartar los cambios sin guardar?")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    function navigate(e: MouseEvent) {
      const link = e.target instanceof Element && e.target.closest("a[href]");
      if (
        link &&
        !e.ctrlKey &&
        !e.metaKey &&
        !window.confirm("¿Salir y descartar los cambios sin guardar?")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    const navigation = (window as Window & { navigation?: EventTarget })
      .navigation;
    function traverse(e: Event & { navigationType?: string }) {
      if (
        e.navigationType === "traverse" &&
        e.cancelable &&
        !window.confirm("¿Descartar los cambios sin guardar?")
      )
        e.preventDefault();
    }
    navigation?.addEventListener("navigate", traverse);
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    document.addEventListener("submit", logout, true);
    return () => {
      navigation?.removeEventListener("navigate", traverse);
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
      document.removeEventListener("submit", logout, true);
    };
  }, [dirty]);
}
