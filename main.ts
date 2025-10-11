import { App, Editor, MarkdownView, Modal, Plugin, Setting } from 'obsidian';

interface LinkContentDictionary {
  [key: string]: string;
}

function applyColor(text: string, color: string): string {
	return `<span style="color:${color}">${text}</span>`;
}

function generateTable(fileName: string, windowsLink: string, macLink: string, mobileLink: string, preview: boolean): string {
	if (preview) {
		return `|                                                                                           | File: ${fileName}                                                                                           |            |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------- |
| ![Windows](${windowsLink}) | ![MacOS](${macLink})<br> | ![Mobile](${mobileLink}) |`
	} else {
		return `|                                                                                           | File: ${fileName}                                                                                           |            |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------- |
| [Windows](${windowsLink}) | [MacOS](${macLink})<br> | [Mobile](${mobileLink}) |`
	}
}

function generateLinkContent(path: string): LinkContentDictionary {
	// Remove all double-quotes from the path
	path = path.replace(/"/g, '');
	
	let windowsLink = '';
	let macLink = '';
	let mobileLink = 'Not supported yet';
	
	if (path.contains('Z:') || path.contains('z:')) {
		// Windows path was provided
		const cleanPath = path.replace(/\\/g, '/');
		windowsLink = `<file:///${cleanPath}>`;
		
		// Convert to Mac path: Z:/Shared/... -> /Volumes/Files/Shared/...
		const relativePath = cleanPath.substring(2); // Remove "Z:"
		macLink = `<file:///Volumes/Files${relativePath}>`;
		
	} else if (path.contains('/Volumes/Files')) {
		// Mac path was provided
		macLink = `<file://${path}>`;
		
		// Convert to Windows path: /Volumes/Files/Shared/... -> Z:/Shared/...
		const relativePath = path.substring('/Volumes/Files'.length); // Remove "/Volumes/Files"
		const windowsPath = `Z:${relativePath}`;
		windowsLink = `<file:///${windowsPath}>`;
	}

	const links: LinkContentDictionary = {
		"windows": windowsLink,
		"mac": macLink,
		"mobile": mobileLink
	};

	return links;
}

function createContent(path: string, preview: boolean): string {
	const fileName = (path.split('\\').pop()?.split('/').pop() || 'Unknown File').replace(/"/g, '');
	const links = generateLinkContent(path);
	
	return generateTable(fileName, links.windows, links.mac, links.mobile, preview);
}

export default class HaremPlugin extends Plugin {
	async onload() {
		/* The command below will insert the links to each of the NAS files by OS
		 * The supported OS options:
		 * - Windows
		 * - Mac
		 * - Mobile (placeholder)
		 */
		this.addCommand({
			id: 'add-nas-links',
			name: 'Add NAS Links',
			editorCallback: (editor: Editor, _view: MarkdownView) => {
				new NASLinksModal(this.app, (result, preview) => {
					const content = createContent(result, preview);
					editor.replaceRange(content, editor.getCursor());
				}).open();

				return true;
			}
		})

		/* The command below will modify the text selected to be styled with a color.
		 * This will directly impact text, not interacting with CSS.
		 */
		this.addCommand({
			id: 'colorize-text',
			name: 'Apply Color to Text',
			editorCallback: (editor: Editor, _view: MarkdownView) => {
				new ColorModal(this.app, (result) => {
					const selection = editor.getSelection();
					const content = applyColor(selection, result);
					editor.replaceSelection(content);
				}).open();

				return true;
			}
		})
	}

	onunload() {}
}

// Ex. Dark Matter PDF Links
// Input: 
// Z:\Shared\DnD\Current Campaign\Dark Matter Campaign\Dark Matter.pdf
//
// Output:
// [Windows](<file:///Z:/Shared/DnD/Current Campaign/Dark Matter Campaign/Dark Matter.pdf>)
// [MacOS](<file:///Volumes/Files/Shared/DnD/Current Campaign/Dark Matter Campaign/Dark Matter.pdf>)

export class NASLinksModal extends Modal {
	onSubmit: (result: string, preview: boolean) => void;
	path = '';
	preview = false;

	constructor(app: App, onSubmit: (result: string, preview: boolean) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.setTitle('Input File Path');
		
		new Setting(this.contentEl)
			.setName('Path')
			.addText((text) =>
				text.onChange((value) => {
					this.path = value;
				}));

		new Setting(this.contentEl)
                .setName('Enable Preview')
                .addToggle(toggle => toggle
                    .setValue(false) // Initial state of the checkbox
                    .onChange((value) => {
                        this.preview = value;
                    }));

		new Setting(this.contentEl)
			.addButton((btn) =>
				btn
					.setButtonText('Submit')
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.path, this.preview);
					}));
	}

	onOpen() {
		super.onOpen();
		
		// Add Enter key listener
		this.contentEl.addEventListener('keydown', (event) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				this.submit();
			}
		});
	}

	submit() {
		this.close();
		this.onSubmit(this.path, this.preview);
	}
}

export class ColorModal extends Modal { 
	onSubmit: (result: string) => void; 
	color = '#fff';
 
	constructor(app: App, onSubmit: (result: string) => void) { 
		super(app); 
		this.onSubmit = onSubmit; 
		this.setTitle('Select Color'); 
		
		// Create a container for the color picker
		const colorPickerContainer = this.contentEl.createDiv();
		colorPickerContainer.style.marginBottom = '20px';
		
		// Create label
		const label = colorPickerContainer.createEl('label');
		label.textContent = 'Color: ';
		label.style.marginRight = '10px';
		
		// Create color picker input
		const colorInput = colorPickerContainer.createEl('input');
		colorInput.type = 'color';
		colorInput.value = this.color;
		colorInput.style.width = '60px';
		colorInput.style.height = '30px';
		colorInput.style.cursor = 'pointer';
		
		// Update color when changed in picker
		colorInput.addEventListener('input', (e) => {
			this.color = (e.target as HTMLInputElement).value;
		});
		
		// Add Enter key listener to color input
		colorInput.addEventListener('keydown', (event) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				this.submit();
			}
		});
		
		// Create the dropdown for html named colors
		const dropdownContainer = this.contentEl.createDiv();
		dropdownContainer.style.marginBottom = '20px';
		
		// Create a dropdown label
		const dropdownLabel = dropdownContainer.createEl('label');
		dropdownLabel.textContent = 'Or select a named color: ';
		dropdownLabel.style.marginRight = '10px';

		// create the dropdown
		const colorDropdown = dropdownContainer.createEl('select');
		const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'black', 'white', 'gray', 'pink', 'brown', 'cyan', 'magenta', 'lime', 'teal', 'navy'];
		colors.forEach((color) => {
			const option = colorDropdown.createEl('option');
			option.value = color;
			option.textContent = color.charAt(0).toUpperCase() + color.slice(1);
		});
		
		// Update color when changed in dropdown
		colorDropdown.addEventListener('change', (e) => {
			this.color = (e.target as HTMLSelectElement).value;
			colorInput.value = this.color; // Sync color picker with dropdown
		});

		// Add submit button
		new Setting(this.contentEl) 
			.addButton((btn) => 
				btn 
					.setButtonText('Submit') 
					.setCta() 
					.onClick(() => { 
						this.submit();
					})); 
	}

	onOpen() {
		super.onOpen();
		
		// Add Enter key listener for the entire modal
		this.contentEl.addEventListener('keydown', (event) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				this.submit();
			}
		});
	}

	submit() {
		this.close();
		this.onSubmit(this.color);
	}
}
