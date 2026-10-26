

class StudentSimilarityService {

  normalizeString(str: string): string {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase()
      .trim()
  }

  levenshtein(a: string, b: string): number {
    const m = a.length
    const n = b.length
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1]
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],     // remoção
            dp[i][j - 1],     // inserção
            dp[i - 1][j - 1]  // substituição
          )
        }
      }
    }

    return dp[m][n]
  }

  isSimilar(a: string, b: string, threshold = 0.8): boolean {
    const normA = this.normalizeString(a)
    const normB = this.normalizeString(b)

    const maxLength = Math.max(normA.length, normB.length)
    if (maxLength === 0) return true // strings vazias = iguais

    const dist = this.levenshtein(normA, normB)
    const similarity = 1 - dist / maxLength

    return similarity >= threshold
  }
}

export const studentSimilarityService = new StudentSimilarityService()
