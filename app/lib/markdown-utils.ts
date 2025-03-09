import { Node } from '@tiptap/pm/model'

/**
 * Converts a TipTap document node to Markdown
 * This is a simplified version that focuses on common elements
 */
export function generateMarkdownFromNode(doc: Node): string {
  let markdown = ''
  
  doc.descendants((node, pos, parent) => {
    // Handle different node types
    if (node.type.name === 'paragraph') {
      const content = node.textContent
      if (content) {
        markdown += content + '\n\n'
      }
      return false // Don't traverse children, we got the text
    }
    
    // Handle headings
    if (node.type.name === 'heading') {
      const level = node.attrs.level
      const content = node.textContent
      const prefix = '#'.repeat(level) + ' '
      
      markdown += prefix + content + '\n\n'
      return false
    }
    
    // Handle bulletLists
    if (node.type.name === 'bulletList') {
      // We'll handle list items individually
      return true // Continue traversing
    }
    
    // Handle orderedLists
    if (node.type.name === 'orderedList') {
      // We'll handle list items individually  
      return true // Continue traversing
    }
    
    // Handle listItem
    if (node.type.name === 'listItem') {
      let content = node.textContent
      
      // Check if parent is bulletList or orderedList
      if (parent?.type.name === 'bulletList') {
        markdown += '- ' + content + '\n'
      } else if (parent?.type.name === 'orderedList') {
        // Since we don't have item index, use 1 for all
        markdown += '1. ' + content + '\n'
      }
      
      return false
    }
    
    // Handle blockquote
    if (node.type.name === 'blockquote') {
      const content = node.textContent
      markdown += '> ' + content + '\n\n'
      return false
    }
    
    // Handle code blocks
    if (node.type.name === 'codeBlock') {
      const content = node.textContent
      const language = node.attrs.language || ''
      
      markdown += '```' + language + '\n' + content + '\n```\n\n'
      return false
    }
    
    // Handle horizontal rule
    if (node.type.name === 'horizontalRule') {
      markdown += '---\n\n'
      return false
    }
    
    return true // Continue traversing 
  })
  
  return markdown.trim()
}

/**
 * Sanitizes markdown for use in completions
 */
export function sanitizeMarkdown(markdown: string): string {
  // Remove any potential code block wrappers from the AI response
  if (markdown.startsWith('```') && markdown.includes('\n')) {
    const lines = markdown.split('\n')
    const firstLine = lines[0]
    
    // If first line is just ``` or ```language, remove it
    if (firstLine.match(/^```[a-z]*$/)) {
      lines.shift()
    }
    
    // If last line is just ```, remove it
    if (lines[lines.length - 1] === '```') {
      lines.pop()
    }
    
    return lines.join('\n')
  }
  
  return markdown
} 