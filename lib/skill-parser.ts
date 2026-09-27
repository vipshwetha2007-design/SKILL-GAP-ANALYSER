export function extractSkills(text: string): { name: string; count: number }[] {
  const normalizedText = text.toLowerCase();
  
  // A dictionary of broad skills mapping to their standard display names.
  const skillDict: Record<string, string[]> = {
    "Java": ["java", "j2ee", "spring", "spring boot", "hibernate"],
    "Python": ["python", "django", "flask", "fastapi", "pandas", "numpy"],
    "SQL": ["sql", "mysql", "postgresql", "postgres", "sql server", "pl/sql", "rdbms"],
    "JavaScript": ["javascript", "js", "es6"],
    "TypeScript": ["typescript", "ts"],
    "React": ["react", "react.js", "reactjs"],
    "Node.js": ["node.js", "nodejs", "node"],
    "C++": ["c++", "cpp"],
    "C#": ["c#", "csharp", ".net"],
    "AWS": ["aws", "amazon web services", "ec2", "s3"],
    "Azure": ["azure"],
    "GCP": ["gcp", "google cloud platform"],
    "Docker": ["docker"],
    "Kubernetes": ["kubernetes", "k8s"],
    "Git": ["git", "github", "gitlab", "bitbucket"],
    "CI/CD": ["ci/cd", "continuous integration", "jenkins", "github actions"],
    "HTML/CSS": ["html", "css", "html5", "css3", "tailwind"],
    "Data Structures & Algorithms": ["data structures", "algorithms", "dsa", "leetcode", "competitive programming"],
    "MongoDB": ["mongodb", "mongo", "nosql"],
    "GraphQL": ["graphql"],
    "Redis": ["redis"],
    "Linux": ["linux", "unix", "ubuntu", "bash", "shell scripting"],
    "Machine Learning": ["machine learning", "ml", "artificial intelligence", "ai", "tensorflow", "pytorch", "scikit-learn"],
    "Agile": ["agile", "scrum", "jira"],
    "Communication": ["communication", "presentation", "leadership", "public speaking", "teamwork", "collaboration"]
  };

  const found: { name: string; count: number }[] = [];

  for (const [standardName, aliases] of Object.entries(skillDict)) {
    let totalOccurrences = 0;
    
    for (const alias of aliases) {
      const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      const regex = new RegExp(`\\b${escapedAlias}\\b`, 'gi');
      
      const matches = text.match(regex);
      if (matches) {
        totalOccurrences += matches.length;
      } else {
        if (alias === 'c++' || alias === 'c#') {
          const fallbackRegex = new RegExp(`${escapedAlias}`, 'gi');
          const fallbackMatches = text.match(fallbackRegex);
          if (fallbackMatches) totalOccurrences += fallbackMatches.length;
        }
      }
    }
    
    if (totalOccurrences > 0) {
      found.push({ name: standardName, count: totalOccurrences });
    }
  }

  return found.sort((a, b) => b.count - a.count);
}
