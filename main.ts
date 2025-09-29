import { App, Editor, MarkdownView, Modal, Plugin, Setting } from 'obsidian';

interface LinkContentDictionary {
  [key: string]: string;
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

export default class GinnyPlugin extends Plugin {
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

	constructor(app: App, onSubmit: (result: string, preview: boolean) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.setTitle('Input File Path');

		let path = '';
		new Setting(this.contentEl)
			.setName('Path')
			.addText((text) =>
				text.onChange((value) => {
					path = value;
				}));

		let preview = false;
		new Setting(this.contentEl)
                .setName('Enable Preview')
                .addToggle(toggle => toggle
                    .setValue(false) // Initial state of the checkbox
                    .onChange((value) => {
                        preview = value;
                    }));

		new Setting(this.contentEl)
			.addButton((btn) =>
				btn
					.setButtonText('Submit')
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(path, preview);
					}));
	}
}