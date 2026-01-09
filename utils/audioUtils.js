export function playFeedbackSound(type = 'positive') {
    const id = type === 'positive' ? 'positiveSound' : 'negativeSound';
    const el = document.getElementById(id);
    if (!el)
        return;
    try {
        el.currentTime = 0;
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        el.play();
    }
    catch {
        // falha silenciosa; feedback sonoro é opcional
    }
}
export function playSuccessSound() {
    playFeedbackSound('positive');
}
export function playErrorSound() {
    playFeedbackSound('negative');
}
