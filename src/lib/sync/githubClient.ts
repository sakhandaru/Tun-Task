export interface GitHubFile {
  content: string
  sha: string
}

const toBase64 = (str: string): string => {
  return btoa(unescape(encodeURIComponent(str)))
}

const fromBase64 = (str: string): string => {
  return decodeURIComponent(escape(atob(str.replace(/\s/g, ''))))
}

export async function getFileContent(
  pat: string,
  repo: string,
  path: string
): Promise<GitHubFile> {
  const url = `https://api.github.com/repos/${repo}/contents/${path}`
  const response = await fetch(url, {
    headers: {
      Authorization: `token ${pat}`,
      Accept: 'application/vnd.github.v3+json',
      'Cache-Control': 'no-cache',
    },
  })

  if (response.status === 404) {
    return { content: '', sha: '' }
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`GitHub API error (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  const content = fromBase64(data.content as string)
  return {
    content,
    sha: data.sha as string,
  }
}

export async function updateFileContent(
  pat: string,
  repo: string,
  path: string,
  content: string,
  sha?: string
): Promise<string> {
  const url = `https://api.github.com/repos/${repo}/contents/${path}`
  const body: Record<string, any> = {
    message: `sync: update tasks in ${path}`,
    content: toBase64(content),
  }

  if (sha) {
    body.sha = sha
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${pat}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`GitHub PUT error (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  return data.content.sha as string
}
