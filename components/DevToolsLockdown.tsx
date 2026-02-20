import React, { useEffect } from 'react';

/**
 * DevToolsLockdown
 * Proteção contra inspeção de código e uso do console.
 * Permite acesso apenas se a URL contiver o segredo definido.
 */
const DevToolsLockdown: React.FC = () => {
    // CHAVE SECRETA - Altere para algo que só você saiba
    const SECRET_KEY = 'rw_admin_2026';

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const hasAccess = urlParams.get('devMode') === SECRET_KEY;

        if (hasAccess) {
            console.log("🔒 [SECURITY] DevMode Ativo. Proteções desabilitadas.");
            return;
        }

        // 1. Bloquear Botão Direito (Context Menu)
        const blockContextMenu = (e: MouseEvent) => e.preventDefault();
        document.addEventListener('contextmenu', blockContextMenu);

        // 2. Bloquear Atalhos de Teclado
        const blockShortcuts = (e: KeyboardEvent) => {
            // F12
            if (e.key === 'F12') {
                e.preventDefault();
                return false;
            }
            // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Chrome/Edge/Opera)
            if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
                e.preventDefault();
                return false;
            }
            // Ctrl+U (Ver Código Fonte)
            if (e.ctrlKey && e.key === 'u') {
                e.preventDefault();
                return false;
            }
            // Ctrl+S (Salvar Página)
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                return false;
            }
        };
        document.addEventListener('keydown', blockShortcuts);

        // 3. Debugger Loop (Trava o console se aberto)
        // Esta técnica usa o fato de que o 'debugger' só pausa se o devtools estiver aberto
        const debuggerLoop = setInterval(() => {
            const startTime = performance.now();
            debugger;
            const endTime = performance.now();

            // Se o tempo entre o debugger e a próxima linha for longo, devtools está aberto
            if (endTime - startTime > 100) {
                // Opcional: Redirecionar ou limpar o body
                // window.location.href = "about:blank";
            }
        }, 1000);

        // 4. Detecção de Redimensionamento (Comum ao abrir DevTools lateral)
        const checkResize = () => {
            const threshold = 160;
            const widthDiff = window.outerWidth - window.innerWidth > threshold;
            const heightDiff = window.outerHeight - window.innerHeight > threshold;

            if (widthDiff || heightDiff) {
                // DevTools provavelmente aberto
            }
        };
        window.addEventListener('resize', checkResize);

        // Cleanup
        return () => {
            document.removeEventListener('contextmenu', blockContextMenu);
            document.removeEventListener('keydown', blockShortcuts);
            clearInterval(debuggerLoop);
            window.removeEventListener('resize', checkResize);
        };
    }, []);

    return null; // Componente invisível
};

export default DevToolsLockdown;
