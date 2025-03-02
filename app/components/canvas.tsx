// Find where your text is being rendered and ensure it has the proper direction
<div className="text-editor" dir="ltr">
  {/* Your text content */}
</div> 

// When drawing text on canvas
const drawText = (ctx, text, x, y) => {
  ctx.direction = 'ltr'; // Ensure left-to-right text direction
  ctx.textAlign = 'left'; // Align text from the left
  ctx.fillText(text, x, y);
}; 