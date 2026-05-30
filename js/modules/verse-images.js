/**
 * Enhanced Shareable Verse Images Module
 * Generate beautiful verse images with advanced customization
 */

const VerseImages = (() => {
  const TEMPLATES = {
    minimal: {
      name: 'Minimal Typography',
      bgGradient: ['#E3F2FD', '#FFF8F0'],
      textColor: '#2C3E50',
      refColor: '#5D6D7E',
      font: 'Cormorant Garamond'
    },
    seasonal: {
      name: 'Seasonal Colors',
      bgGradient: null,
      textColor: '#FFFFFF',
      refColor: '#F0F0F0',
      font: 'Cormorant Garamond'
    },
    polaroid: {
      name: 'Polaroid Card',
      bgGradient: ['#FFFFFF', '#FAFAFA'],
      textColor: '#2C3E50',
      refColor: '#5D6D7E',
      font: 'Cormorant Garamond',
      hasBorder: true
    },
    texture: {
      name: 'Textured Paper',
      bgGradient: ['#F5F1E8', '#E8DCC8'],
      textColor: '#3E2723',
      refColor: '#6D4C41',
      font: 'Cormorant Garamond',
      hasTexture: true
    },
    modern: {
      name: 'Modern Gradient',
      bgGradient: ['#667eea', '#764ba2'],
      textColor: '#FFFFFF',
      refColor: '#F0F0F0',
      font: 'Source Sans 3'
    },
    classic: {
      name: 'Classic Scripture',
      bgGradient: ['#2C3E50', '#34495E'],
      textColor: '#ECF0F1',
      refColor: '#BDC3C7',
      font: 'Cormorant Garamond'
    }
  };

  const FONTS = [
    { value: 'Cormorant Garamond', label: 'Elegant Serif' },
    { value: 'Source Sans 3', label: 'Clean Sans-Serif' },
    { value: 'Georgia', label: 'Classic Serif' }
  ];

  const ASPECT_RATIOS = [
    { value: 'square', label: 'Square (1:1)', width: 1080, height: 1080 },
    { value: 'story', label: 'Story (9:16)', width: 1080, height: 1920 },
    { value: 'wide', label: 'Wide (16:9)', width: 1920, height: 1080 }
  ];

  const ALIGNMENTS = [
    { value: 'center', label: 'Center' },
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' }
  ];

  let currentTemplate = 'minimal';

  async function generateImage(verseText, reference, season = 'winter', options = {}) {
    const {
      template = 'minimal',
      fontSize = 'medium',
      customTextColor = null,
      customBgColor = null,
      font = null,
      aspectRatio = 'square',
      alignment = 'center'
    } = options;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const ratio = ASPECT_RATIOS.find(r => r.value === aspectRatio) || ASPECT_RATIOS[0];
    if (!ratio) {
      throw new Error('No aspect ratios available');
    }
    
    canvas.width = ratio.width;
    canvas.height = ratio.height;
    
    const tmpl = TEMPLATES[template] || TEMPLATES.minimal;
    const selectedFont = font || tmpl.font;
    
    // Draw background
    if (customBgColor) {
      ctx.fillStyle = customBgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (tmpl.bgGradient || template === 'seasonal') {
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      
      if (template === 'seasonal') {
        const seasonColors = getSeasonColors(season);
        gradient.addColorStop(0, seasonColors[0]);
        gradient.addColorStop(1, seasonColors[1]);
      } else {
        gradient.addColorStop(0, tmpl.bgGradient[0]);
        gradient.addColorStop(1, tmpl.bgGradient[1]);
      }
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    if (tmpl.hasTexture) {
      addTextureOverlay(ctx, canvas.width, canvas.height);
    }
    
    if (tmpl.hasBorder) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = tmpl.bgGradient[0];
      ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 140);
    }
    
    const padding = tmpl.hasBorder ? 120 : 100;
    const maxWidth = canvas.width - (padding * 2);
    
    ctx.fillStyle = customTextColor || tmpl.textColor;
    ctx.textAlign = alignment;
    ctx.textBaseline = 'middle';
    
    const baseFontSize = getBaseFontSize(fontSize, aspectRatio);
    const calculatedSize = calculateFontSize(verseText, maxWidth, baseFontSize);
    ctx.font = `italic ${calculatedSize}px "${selectedFont}", serif`;
    
    const lines = wrapText(ctx, verseText, maxWidth);
    const lineHeight = calculatedSize * 1.5;
    const totalHeight = lines.length * lineHeight;
    const startY = (canvas.height - totalHeight) / 2;
    
    const xPos = alignment === 'left' ? padding : 
                 alignment === 'right' ? canvas.width - padding :
                 canvas.width / 2;
    
    lines.forEach((line, i) => {
      ctx.fillText(line, xPos, startY + (i * lineHeight));
    });
    
    ctx.font = `500 ${calculatedSize * 0.5}px "${selectedFont}", serif`;
    ctx.fillStyle = customTextColor || tmpl.refColor;
    const refY = startY + totalHeight + 60;
    ctx.fillText(reference, xPos, refY);
    
    if (template === 'seasonal') {
      drawSeasonBadge(ctx, canvas.width, canvas.height, season);
    }
    
    ctx.font = '300 20px "Source Sans 3", sans-serif';
    ctx.fillStyle = tmpl.hasBorder ? '#999999' : 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('Spiritual Seasons', canvas.width / 2, canvas.height - 40);
    
    return canvas;
  }

  function getSeasonColors(season) {
    const colors = {
      winter: ['#4A90A4', '#2C5F6F'],
      spring: ['#90C695', '#5A8F5E'],
      summer: ['#F4A261', '#E76F51'],
      autumn: ['#D4A574', '#B07D4A']
    };
    return colors[season] || colors.winter;
  }

  function addTextureOverlay(ctx, width, height) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 5000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#000000' : '#FFFFFF';
      ctx.fillRect(
        Math.random() * width,
        Math.random() * height,
        2,
        2
      );
    }
    ctx.restore();
  }

  function drawSeasonBadge(ctx, width, height, season) {
    const badgeText = season.charAt(0).toUpperCase() + season.slice(1);
    const badgeY = 80;
    
    ctx.save();
    ctx.font = '600 24px "Source Sans 3", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'center';
    
    const metrics = ctx.measureText(badgeText);
    const badgeWidth = metrics.width + 40;
    const badgeHeight = 40;
    const badgeX = (width - badgeWidth) / 2;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY - badgeHeight/2, badgeWidth, badgeHeight, 20);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(badgeText, width / 2, badgeY);
    ctx.restore();
  }

  function getBaseFontSize(size, aspectRatio) {
    const bases = {
      small: aspectRatio === 'story' ? 48 : 54,
      medium: aspectRatio === 'story' ? 56 : 64,
      large: aspectRatio === 'story' ? 64 : 72
    };
    return bases[size] || bases.medium;
  }

  function calculateFontSize(text, maxWidth, baseSize) {
    const minSize = 36;
    const maxSize = baseSize;
    
    if (text.length < 50) return maxSize;
    if (text.length > 150) return minSize;
    
    return Math.max(minSize, Math.min(maxSize, baseSize - (text.length / 10)));
  }

  function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  async function downloadImage(canvas, filename = 'verse') {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to generate image'));
          return;
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        resolve();
      }, 'image/png');
    });
  }

  async function shareImage(canvas, verseText, reference) {
    if (!navigator.share || !navigator.canShare) {
      throw new Error('Web Share API not supported');
    }
    
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('Failed to generate image'));
          return;
        }
        
        const file = new File([blob], 'verse.png', { type: 'image/png' });
        const shareData = {
          title: reference,
          text: verseText,
          files: [file]
        };
        
        if (navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
            resolve();
          } catch (error) {
            if (error.name !== 'AbortError') {
              reject(error);
            } else {
              resolve();
            }
          }
        } else {
          reject(new Error('Cannot share this content'));
        }
      }, 'image/png');
    });
  }

  async function showGenerator(verseText, reference, season = 'winter') {
    let options = {
      template: currentTemplate,
      fontSize: 'medium',
      customTextColor: null,
      customBgColor: null,
      font: null,
      aspectRatio: 'square',
      alignment: 'center'
    };
    
    let previewCanvas = await generateImage(verseText, reference, season, options);
    
    const modalContent = document.createElement('div');
    modalContent.style.maxHeight = '70vh';
    modalContent.style.overflowY = 'auto';
    modalContent.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-3); margin-bottom: var(--space-4);">
        <div>
          <label style="display: block; margin-bottom: var(--space-2); font-weight: 600; font-size: var(--text-sm);">
            Template
          </label>
          <select id="template-select" class="form-select">
            ${Object.entries(TEMPLATES).map(([key, tmpl]) => `
              <option value="${key}" ${key === options.template ? 'selected' : ''}>
                ${tmpl.name}
              </option>
            `).join('')}
          </select>
        </div>

        <div>
          <label style="display: block; margin-bottom: var(--space-2); font-weight: 600; font-size: var(--text-sm);">
            Size
          </label>
          <select id="font-size-select" class="form-select">
            <option value="small">Small</option>
            <option value="medium" selected>Medium</option>
            <option value="large">Large</option>
          </select>
        </div>

        <div>
          <label style="display: block; margin-bottom: var(--space-2); font-weight: 600; font-size: var(--text-sm);">
            Font
          </label>
          <select id="font-select" class="form-select">
            ${FONTS.map(f => `
              <option value="${f.value}">${f.label}</option>
            `).join('')}
          </select>
        </div>

        <div>
          <label style="display: block; margin-bottom: var(--space-2); font-weight: 600; font-size: var(--text-sm);">
            Ratio
          </label>
          <select id="aspect-select" class="form-select">
            ${ASPECT_RATIOS.map(r => `
              <option value="${r.value}" ${r.value === 'square' ? 'selected' : ''}>
                ${r.label}
              </option>
            `).join('')}
          </select>
        </div>

        <div>
          <label style="display: block; margin-bottom: var(--space-2); font-weight: 600; font-size: var(--text-sm);">
            Align
          </label>
          <select id="alignment-select" class="form-select">
            ${ALIGNMENTS.map(a => `
              <option value="${a.value}" ${a.value === 'center' ? 'selected' : ''}>
                ${a.label}
              </option>
            `).join('')}
          </select>
        </div>

        <div>
          <label style="display: block; margin-bottom: var(--space-2); font-weight: 600; font-size: var(--text-sm);">
            Text Color
          </label>
          <div style="display: flex; gap: var(--space-2);">
            <input type="color" id="text-color-picker" class="form-control" style="height: 38px; padding: 4px;">
            <button class="btn btn-ghost btn-sm" id="reset-text-color" style="flex-shrink: 0;">Reset</button>
          </div>
        </div>
      </div>

      <div id="preview-container" style="text-align: center; margin: var(--space-4) 0; background: var(--bg-secondary); padding: var(--space-4); border-radius: var(--radius-lg);">
        <canvas id="preview-canvas" style="max-width: 100%; height: auto; border-radius: var(--radius-md); box-shadow: var(--shadow-lg);"></canvas>
      </div>

      <div style="background: linear-gradient(135deg, var(--winter-primary-light), var(--spring-primary-light)); padding: var(--space-3); border-radius: var(--radius-md);">
        <p style="font-size: var(--text-sm); color: var(--text-primary); margin: 0; text-align: center;">
          <strong>💡 Tip:</strong> Images are optimized for social media sharing
        </p>
      </div>
    `;
    
    const previewCanvasEl = modalContent.querySelector('#preview-canvas');
    previewCanvasEl.width = previewCanvas.width;
    previewCanvasEl.height = previewCanvas.height;
    previewCanvasEl.getContext('2d').drawImage(previewCanvas, 0, 0);
    
    async function regeneratePreview() {
      const newCanvas = await generateImage(verseText, reference, season, options);
      previewCanvasEl.width = newCanvas.width;
      previewCanvasEl.height = newCanvas.height;
      const ctx = previewCanvasEl.getContext('2d');
      ctx.clearRect(0, 0, newCanvas.width, newCanvas.height);
      ctx.drawImage(newCanvas, 0, 0);
      previewCanvas = newCanvas;
    }

    const addListener = (id, property, isColor = false) => {
      const element = modalContent.querySelector(id);
      element.addEventListener('change', async (e) => {
        options[property] = isColor && e.target.value ? e.target.value : e.target.value;
        await regeneratePreview();
      });
    };

    addListener('#template-select', 'template');
    addListener('#font-size-select', 'fontSize');
    addListener('#font-select', 'font');
    addListener('#aspect-select', 'aspectRatio');
    addListener('#alignment-select', 'alignment');
    addListener('#text-color-picker', 'customTextColor', true);

    modalContent.querySelector('#reset-text-color').addEventListener('click', async () => {
      options.customTextColor = null;
      modalContent.querySelector('#text-color-picker').value = '#000000';
      await regeneratePreview();
    });

    const supportsShare = navigator.share && navigator.canShare;

    const modal = Modal.create({
      title: 'Create Verse Image',
      content: modalContent,
      size: 'large',
      buttons: [
        {
          text: 'Download',
          className: 'btn-primary',
          onClick: async () => {
            try {
              await downloadImage(previewCanvas, `${reference.replace(/[^a-z0-9]/gi, '-')}`);
              Toast.success('Image downloaded!');
              return true;
            } catch (error) {
              Toast.error('Download failed');
              return false;
            }
          }
        },
        ...(supportsShare ? [{
          text: 'Share',
          className: 'btn-secondary',
          onClick: async () => {
            try {
              await shareImage(previewCanvas, verseText, reference);
              Toast.success('Shared successfully!');
              return true;
            } catch (error) {
              if (error.message !== 'Web Share API not supported') {
                Toast.error('Share failed');
              }
              return false;
            }
          }
        }] : []),
        {
          text: 'Close',
          className: 'btn-ghost'
        }
      ]
    });

    return modal;
  }

  return {
    generateImage,
    showGenerator,
    downloadImage,
    shareImage
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = VerseImages;
}
