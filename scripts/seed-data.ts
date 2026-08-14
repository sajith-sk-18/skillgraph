/**
 * The SkillGraph demo dataset.
 *
 * ALL RECORDS ARE FICTIONAL. The employees, clients and projects below are
 * invented for demonstration purposes and do not describe real people or
 * organisations.
 *
 * Two rules govern this file:
 *
 * 1. NOTHING IS RANDOM. `Math.random()` would make every seed produce a
 *    different graph, so the same demo would rank different candidates each
 *    run and no assertion could be written against it. Variation comes from a
 *    string hash instead - varied, but identical on every run.
 *
 * 2. STRUCTURE BEFORE VOLUME. Employees are built from archetypes, and project
 *    staffing prefers people who actually hold the required skills. That is
 *    what makes WORKED_WITH meaningful: colleagues share projects because
 *    their skills fit the same work, exactly as they would in a real company.
 */

export interface SeedSkill {
	id: string;
	name: string;
	category: string;
	description: string;
}

export interface SeedEmployee {
	id: string;
	name: string;
	email: string;
	jobTitle: string;
	department: string;
	location: string;
	yearsOfExperience: number;
	availability: string;
	seniority: string;
	bio: string;
	teamId: string;
	roleId: string;
	skills: { skillId: string; proficiency: number; years: number; lastUsed: string }[];
	certificationIds: string[];
}

export interface SeedProject {
	id: string;
	name: string;
	description: string;
	status: string;
	startDate: string;
	endDate: string | null;
	domain: string;
	location: string;
	teamSize: number;
	clientId: string;
	requiredSkills: { skillId: string; proficiency: number; years: number }[];
	technologyIds: string[];
}

export interface SeedAssignment {
	employeeId: string;
	projectId: string;
	role: string;
	startDate: string;
	endDate: string | null;
	responsibility: string;
}

export interface SeedCollaboration {
	a: string;
	b: string;
	projectsTogether: number;
	lastProject: string;
}

/** Deterministic 32-bit string hash - the only source of variation here. */
function hash(input: string): number {
	let h = 2166136261;
	for (let i = 0; i < input.length; i += 1) {
		h ^= input.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return Math.abs(h);
}

/** Deterministic integer in [min, max]. */
function pick(seed: string, min: number, max: number): number {
	return min + (hash(seed) % (max - min + 1));
}

function pickOne<T>(seed: string, items: readonly T[]): T {
	return items[hash(seed) % items.length];
}

// ---------------------------------------------------------------------------
// Skills - unified with Technology. See README "Skill and Technology are one
// node label". A project USED_TECHNOLOGY the same node an employee HAS_SKILL,
// which is what makes Employee -> Skill <- Project a single hop.
// ---------------------------------------------------------------------------

export const SKILLS: SeedSkill[] = [
	{ id: "SKL001", name: "React", category: "Frontend", description: "Component-driven UI library for building interactive web applications." },
	{ id: "SKL002", name: "Next.js", category: "Frontend", description: "React framework with server rendering, routing and edge deployment." },
	{ id: "SKL003", name: "TypeScript", category: "Frontend", description: "Statically typed JavaScript used across frontend and Node services." },
	{ id: "SKL004", name: "Angular", category: "Frontend", description: "Opinionated enterprise frontend framework." },
	{ id: "SKL005", name: "Vue.js", category: "Frontend", description: "Progressive frontend framework for incremental adoption." },
	{ id: "SKL006", name: "Tailwind CSS", category: "Frontend", description: "Utility-first CSS framework for design-system driven interfaces." },
	{ id: "SKL007", name: "Node.js", category: "Backend", description: "JavaScript runtime for building APIs and event-driven services." },
	{ id: "SKL008", name: "Python", category: "Backend", description: "General purpose language used for services, data pipelines and ML." },
	{ id: "SKL009", name: "Java", category: "Backend", description: "JVM language widely used for regulated enterprise systems." },
	{ id: "SKL010", name: "Spring Boot", category: "Backend", description: "Java application framework for production microservices." },
	{ id: "SKL011", name: ".NET Core", category: "Backend", description: "Cross-platform framework for enterprise services on the CLR." },
	{ id: "SKL012", name: "Laravel", category: "Backend", description: "PHP framework used for rapid delivery of business applications." },
	{ id: "SKL013", name: "GraphQL", category: "Backend", description: "Query language for APIs that lets clients request exactly what they need." },
	{ id: "SKL014", name: "AWS", category: "Cloud & DevOps", description: "Amazon Web Services - compute, storage, networking and managed services." },
	{ id: "SKL015", name: "Azure", category: "Cloud & DevOps", description: "Microsoft cloud platform, common in enterprise and public sector." },
	{ id: "SKL016", name: "Docker", category: "Cloud & DevOps", description: "Container packaging and runtime for reproducible deployments." },
	{ id: "SKL017", name: "Kubernetes", category: "Cloud & DevOps", description: "Container orchestration for scaling and operating services." },
	{ id: "SKL018", name: "Terraform", category: "Cloud & DevOps", description: "Declarative infrastructure as code across cloud providers." },
	{ id: "SKL019", name: "CI/CD", category: "Cloud & DevOps", description: "Automated build, test and release pipelines." },
	{ id: "SKL020", name: "PostgreSQL", category: "Data", description: "Relational database used as the system of record on most projects." },
	{ id: "SKL021", name: "MongoDB", category: "Data", description: "Document database for flexible, evolving schemas." },
	{ id: "SKL022", name: "Redis", category: "Data", description: "In-memory store used for caching, queues and sessions." },
	{ id: "SKL023", name: "Kafka", category: "Data", description: "Distributed event streaming platform for high-volume pipelines." },
	{ id: "SKL024", name: "SQL", category: "Data", description: "Query language for relational analysis and reporting." },
	{ id: "SKL025", name: "Machine Learning", category: "AI & Data Science", description: "Predictive modelling, feature engineering and model evaluation." },
	{ id: "SKL026", name: "Generative AI", category: "AI & Data Science", description: "LLM application development, RAG pipelines and evaluation." },
	{ id: "SKL027", name: "Test Automation", category: "Quality", description: "Automated functional and regression testing frameworks." },
	{ id: "SKL028", name: "Performance Testing", category: "Quality", description: "Load, stress and soak testing of production systems." },
];

const SKILL_BY_NAME = new Map(SKILLS.map((s) => [s.name, s.id]));
const id = (name: string): string => {
	const value = SKILL_BY_NAME.get(name);
	if (!value) throw new Error(`Unknown skill in seed data: ${name}`);
	return value;
};

// ---------------------------------------------------------------------------
// Supporting reference data
// ---------------------------------------------------------------------------

export const DOMAINS = [
	"Banking",
	"FinTech",
	"Healthcare",
	"E-Commerce",
	"Logistics",
	"Insurance",
	"Telecom",
	"Travel",
	"Government",
	"Retail",
] as const;

export const CLIENTS = [
	{ id: "CLI001", name: "Emirates Financial Group", industry: "Banking", country: "United Arab Emirates" },
	{ id: "CLI002", name: "Gulf Health Systems", industry: "Healthcare", country: "United Arab Emirates" },
	{ id: "CLI003", name: "Nordic Retail AB", industry: "Retail", country: "Sweden" },
	{ id: "CLI004", name: "Meridian Insurance", industry: "Insurance", country: "United Kingdom" },
	{ id: "CLI005", name: "Cargo Nexus", industry: "Logistics", country: "Singapore" },
	{ id: "CLI006", name: "Falcon Telecom", industry: "Telecom", country: "United Arab Emirates" },
	{ id: "CLI007", name: "Voyager Travel Group", industry: "Travel", country: "Spain" },
	{ id: "CLI008", name: "Civic Digital Authority", industry: "Government", country: "United Arab Emirates" },
	{ id: "CLI009", name: "Apex Payments", industry: "FinTech", country: "United Kingdom" },
	{ id: "CLI010", name: "Harbour Commerce", industry: "E-Commerce", country: "Netherlands" },
	{ id: "CLI011", name: "Sterling Capital", industry: "Banking", country: "United Kingdom" },
	{ id: "CLI012", name: "Oasis Retail Group", industry: "Retail", country: "United Arab Emirates" },
];

export const TEAMS = [
	{ id: "TEAM001", name: "Product Engineering", department: "Engineering" },
	{ id: "TEAM002", name: "Platform Engineering", department: "Engineering" },
	{ id: "TEAM003", name: "Cloud Engineering", department: "Cloud & Infrastructure" },
	{ id: "TEAM004", name: "Data & AI", department: "Data & AI" },
	{ id: "TEAM005", name: "Quality Engineering", department: "Quality" },
	{ id: "TEAM006", name: "Experience Design", department: "Design" },
	{ id: "TEAM007", name: "Integration Engineering", department: "Engineering" },
	{ id: "TEAM008", name: "Solution Architecture", department: "Architecture" },
	{ id: "TEAM009", name: "Programme Management", department: "Delivery" },
	{ id: "TEAM010", name: "Mobile Engineering", department: "Engineering" },
];

export const ROLES = [
	{ id: "ROLE001", name: "Frontend Developer", category: "Engineering" },
	{ id: "ROLE002", name: "Backend Developer", category: "Engineering" },
	{ id: "ROLE003", name: "Full Stack Developer", category: "Engineering" },
	{ id: "ROLE004", name: "DevOps Engineer", category: "Cloud & Infrastructure" },
	{ id: "ROLE005", name: "QA Engineer", category: "Quality" },
	{ id: "ROLE006", name: "Data Engineer", category: "Data & AI" },
	{ id: "ROLE007", name: "Data Scientist", category: "Data & AI" },
	{ id: "ROLE008", name: "AI Engineer", category: "Data & AI" },
	{ id: "ROLE009", name: "Solution Architect", category: "Architecture" },
	{ id: "ROLE010", name: "Project Manager", category: "Delivery" },
	{ id: "ROLE011", name: "UI/UX Designer", category: "Design" },
	{ id: "ROLE012", name: "Business Analyst", category: "Delivery" },
];

export const CERTIFICATIONS = [
	{ id: "CERT001", name: "AWS Certified Developer - Associate", issuer: "Amazon Web Services", level: "Associate" },
	{ id: "CERT002", name: "AWS Certified Solutions Architect - Professional", issuer: "Amazon Web Services", level: "Professional" },
	{ id: "CERT003", name: "Microsoft Certified: Azure Developer Associate", issuer: "Microsoft", level: "Associate" },
	{ id: "CERT004", name: "Microsoft Certified: Azure Solutions Architect Expert", issuer: "Microsoft", level: "Expert" },
	{ id: "CERT005", name: "Certified Kubernetes Administrator", issuer: "CNCF", level: "Professional" },
	{ id: "CERT006", name: "Professional Scrum Master I", issuer: "Scrum.org", level: "Foundation" },
	{ id: "CERT007", name: "Google Cloud Professional Cloud Architect", issuer: "Google Cloud", level: "Professional" },
	{ id: "CERT008", name: "HashiCorp Certified: Terraform Associate", issuer: "HashiCorp", level: "Associate" },
	{ id: "CERT009", name: "ISTQB Certified Tester - Foundation Level", issuer: "ISTQB", level: "Foundation" },
	{ id: "CERT010", name: "TensorFlow Developer Certificate", issuer: "Google", level: "Associate" },
];

// ---------------------------------------------------------------------------
// Archetypes - the reason the graph has shape rather than noise
// ---------------------------------------------------------------------------

interface Archetype {
	key: string;
	jobTitle: string;
	department: string;
	teamId: string;
	roleId: string;
	/** Skills this archetype is strong in - proficiency 7-10. */
	core: string[];
	/** Skills they can contribute to - proficiency 4-7. */
	secondary: string[];
	certifications: string[];
}

const ARCHETYPES: Archetype[] = [
	{
		key: "frontend",
		jobTitle: "Frontend Engineer",
		department: "Engineering",
		teamId: "TEAM001",
		roleId: "ROLE001",
		core: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
		secondary: ["Node.js", "GraphQL", "Vue.js"],
		certifications: [],
	},
	{
		key: "node-backend",
		jobTitle: "Backend Engineer",
		department: "Engineering",
		teamId: "TEAM002",
		roleId: "ROLE002",
		core: ["Node.js", "TypeScript", "PostgreSQL", "GraphQL"],
		secondary: ["Redis", "Docker", "MongoDB"],
		certifications: ["CERT001"],
	},
	{
		key: "java-backend",
		jobTitle: "Senior Backend Engineer",
		department: "Engineering",
		teamId: "TEAM002",
		roleId: "ROLE002",
		core: ["Java", "Spring Boot", "PostgreSQL", "Kafka"],
		secondary: ["Docker", "Kubernetes", "SQL"],
		certifications: ["CERT005"],
	},
	{
		key: "python-backend",
		jobTitle: "Backend Engineer",
		department: "Engineering",
		teamId: "TEAM007",
		roleId: "ROLE002",
		core: ["Python", "PostgreSQL", "Redis"],
		secondary: ["Docker", "Kafka", "MongoDB"],
		certifications: [],
	},
	{
		key: "fullstack",
		jobTitle: "Full Stack Engineer",
		department: "Engineering",
		teamId: "TEAM001",
		roleId: "ROLE003",
		core: ["React", "Node.js", "TypeScript", "PostgreSQL"],
		secondary: ["Next.js", "AWS", "Docker", "GraphQL"],
		certifications: ["CERT001"],
	},
	{
		key: "aws-devops",
		jobTitle: "DevOps Engineer",
		department: "Cloud & Infrastructure",
		teamId: "TEAM003",
		roleId: "ROLE004",
		core: ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD"],
		secondary: ["Python", "PostgreSQL"],
		certifications: ["CERT002", "CERT005", "CERT008"],
	},
	{
		key: "azure-devops",
		jobTitle: "Cloud Engineer",
		department: "Cloud & Infrastructure",
		teamId: "TEAM003",
		roleId: "ROLE004",
		core: ["Azure", "Docker", "Kubernetes", "CI/CD"],
		secondary: [".NET Core", "Terraform"],
		certifications: ["CERT003", "CERT004"],
	},
	{
		key: "data-engineer",
		jobTitle: "Data Engineer",
		department: "Data & AI",
		teamId: "TEAM004",
		roleId: "ROLE006",
		core: ["Python", "SQL", "Kafka", "PostgreSQL"],
		secondary: ["AWS", "MongoDB", "Docker"],
		certifications: ["CERT001"],
	},
	{
		key: "data-scientist",
		jobTitle: "Data Scientist",
		department: "Data & AI",
		teamId: "TEAM004",
		roleId: "ROLE007",
		core: ["Python", "Machine Learning", "SQL"],
		secondary: ["Generative AI", "PostgreSQL"],
		certifications: ["CERT010"],
	},
	{
		key: "ai-engineer",
		jobTitle: "AI Engineer",
		department: "Data & AI",
		teamId: "TEAM004",
		roleId: "ROLE008",
		core: ["Python", "Generative AI", "Machine Learning"],
		secondary: ["AWS", "Docker", "PostgreSQL"],
		certifications: ["CERT010"],
	},
	{
		key: "qa",
		jobTitle: "QA Engineer",
		department: "Quality",
		teamId: "TEAM005",
		roleId: "ROLE005",
		core: ["Test Automation", "Performance Testing", "CI/CD"],
		secondary: ["TypeScript", "Python", "SQL"],
		certifications: ["CERT009"],
	},
	{
		key: "architect",
		jobTitle: "Solution Architect",
		department: "Architecture",
		teamId: "TEAM008",
		roleId: "ROLE009",
		core: ["AWS", "Kubernetes", "PostgreSQL", "Kafka", "Java"],
		secondary: ["Node.js", "Python", "Terraform", "GraphQL"],
		certifications: ["CERT002", "CERT007"],
	},
	{
		key: "designer",
		jobTitle: "UI/UX Designer",
		department: "Design",
		teamId: "TEAM006",
		roleId: "ROLE011",
		core: ["Tailwind CSS"],
		secondary: ["React", "TypeScript"],
		certifications: [],
	},
	{
		key: "delivery",
		jobTitle: "Project Manager",
		department: "Delivery",
		teamId: "TEAM009",
		roleId: "ROLE010",
		core: ["SQL"],
		secondary: ["CI/CD"],
		certifications: ["CERT006"],
	},
	{
		key: "php-backend",
		jobTitle: "Backend Engineer",
		department: "Engineering",
		teamId: "TEAM007",
		roleId: "ROLE002",
		core: ["Laravel", "PostgreSQL", "SQL"],
		secondary: ["Redis", "Docker", "MongoDB"],
		certifications: [],
	},
	{
		key: "mobile",
		jobTitle: "Mobile Engineer",
		department: "Engineering",
		teamId: "TEAM010",
		roleId: "ROLE003",
		core: ["React", "TypeScript"],
		secondary: ["Node.js", "GraphQL", "Tailwind CSS"],
		certifications: [],
	},
	{
		key: "analyst",
		jobTitle: "Business Analyst",
		department: "Delivery",
		teamId: "TEAM009",
		roleId: "ROLE012",
		core: ["SQL"],
		secondary: ["Test Automation"],
		certifications: ["CERT006"],
	},
];

/**
 * 84 fictional people. The archetype index decides their skills; the name is
 * only a label. Order is deliberate: consecutive people share an archetype, so
 * project staffing naturally rotates through specialists of the same kind.
 */
const PEOPLE: { name: string; archetype: string; location: string }[] = [
	{ name: "Arun Kumar", archetype: "fullstack", location: "Dubai" },
	{ name: "Priya Nair", archetype: "aws-devops", location: "Dubai" },
	{ name: "Rahul Sharma", archetype: "node-backend", location: "Dubai" },
	{ name: "Sara Khan", archetype: "data-engineer", location: "Dubai" },
	{ name: "Mohammed Ali", archetype: "qa", location: "Dubai" },
	{ name: "Fatima Al Mansoori", archetype: "frontend", location: "Abu Dhabi" },
	{ name: "Daniel Okafor", archetype: "java-backend", location: "London" },
	{ name: "Aisha Rahman", archetype: "architect", location: "Dubai" },
	{ name: "Vikram Menon", archetype: "python-backend", location: "Bengaluru" },
	{ name: "Elena Petrova", archetype: "frontend", location: "London" },
	{ name: "Omar Haddad", archetype: "azure-devops", location: "Dubai" },
	{ name: "Nisha Pillai", archetype: "data-scientist", location: "Kochi" },
	{ name: "James Whitfield", archetype: "architect", location: "London" },
	{ name: "Layla Ibrahim", archetype: "fullstack", location: "Dubai" },
	{ name: "Karthik Raman", archetype: "node-backend", location: "Chennai" },
	{ name: "Sofia Almeida", archetype: "designer", location: "Barcelona" },
	{ name: "Hassan Yusuf", archetype: "aws-devops", location: "Abu Dhabi" },
	{ name: "Meera Krishnan", archetype: "ai-engineer", location: "Bengaluru" },
	{ name: "Thomas Lindqvist", archetype: "java-backend", location: "Stockholm" },
	{ name: "Zainab Sheikh", archetype: "qa", location: "Dubai" },
	{ name: "Anand Verma", archetype: "fullstack", location: "Bengaluru" },
	{ name: "Claire Dubois", archetype: "frontend", location: "London" },
	{ name: "Yusuf Bakr", archetype: "python-backend", location: "Dubai" },
	{ name: "Ritu Desai", archetype: "data-engineer", location: "Kochi" },
	{ name: "Marcus Reid", archetype: "azure-devops", location: "London" },
	{ name: "Hana Suleiman", archetype: "designer", location: "Dubai" },
	{ name: "Deepak Iyer", archetype: "node-backend", location: "Chennai" },
	{ name: "Amira Fadel", archetype: "delivery", location: "Dubai" },
	{ name: "Peter Nowak", archetype: "aws-devops", location: "London" },
	{ name: "Shreya Bhat", archetype: "data-scientist", location: "Bengaluru" },
	{ name: "Khalid Al Zaabi", archetype: "architect", location: "Abu Dhabi" },
	{ name: "Grace Mensah", archetype: "qa", location: "London" },
	{ name: "Rohan Kapoor", archetype: "fullstack", location: "Dubai" },
	{ name: "Ines Moreau", archetype: "frontend", location: "Barcelona" },
	{ name: "Tariq Nasser", archetype: "java-backend", location: "Dubai" },
	{ name: "Lakshmi Suresh", archetype: "ai-engineer", location: "Kochi" },
	{ name: "Oliver Grant", archetype: "node-backend", location: "London" },
	{ name: "Noura Al Blooshi", archetype: "delivery", location: "Dubai" },
	{ name: "Sanjay Gupta", archetype: "python-backend", location: "Bengaluru" },
	{ name: "Emma Larsen", archetype: "designer", location: "Stockholm" },
	{ name: "Bilal Ahmed", archetype: "aws-devops", location: "Dubai" },
	{ name: "Divya Menon", archetype: "data-engineer", location: "Chennai" },
	{ name: "Andreas Weber", archetype: "architect", location: "Amsterdam" },
	{ name: "Salma Othman", archetype: "frontend", location: "Dubai" },
	{ name: "Nikhil Joshi", archetype: "fullstack", location: "Bengaluru" },
	{ name: "Hannah Cole", archetype: "qa", location: "London" },
	{ name: "Faisal Rahim", archetype: "azure-devops", location: "Riyadh" },
	{ name: "Anjali Rao", archetype: "data-scientist", location: "Bengaluru" },
	{ name: "Michael Brennan", archetype: "java-backend", location: "London" },
	{ name: "Reem Al Suwaidi", archetype: "analyst", location: "Abu Dhabi" },
	{ name: "Praveen Nair", archetype: "node-backend", location: "Kochi" },
	{ name: "Julia Sanchez", archetype: "designer", location: "Barcelona" },
	{ name: "Ahmed Saeed", archetype: "python-backend", location: "Dubai" },
	{ name: "Kavya Reddy", archetype: "ai-engineer", location: "Chennai" },
	{ name: "Lucas Ferreira", archetype: "aws-devops", location: "Amsterdam" },
	{ name: "Mariam Zayed", archetype: "frontend", location: "Dubai" },
	{ name: "Siddharth Rao", archetype: "architect", location: "Bengaluru" },
	{ name: "Olivia Hart", archetype: "qa", location: "London" },
	{ name: "Nabil Farouk", archetype: "java-backend", location: "Dubai" },
	{ name: "Pooja Shetty", archetype: "data-engineer", location: "Bengaluru" },
	{ name: "Erik Johansson", archetype: "azure-devops", location: "Stockholm" },
	{ name: "Huda Mansour", archetype: "fullstack", location: "Abu Dhabi" },
	{ name: "Arjun Pillai", archetype: "node-backend", location: "Kochi" },
	{ name: "Beatriz Costa", archetype: "designer", location: "Barcelona" },
	{ name: "Sami Haddad", archetype: "php-backend", location: "Dubai" },
	{ name: "Tanvi Malhotra", archetype: "data-scientist", location: "Bengaluru" },
	{ name: "Charles Adeyemi", archetype: "aws-devops", location: "London" },
	{ name: "Latifa Al Nuaimi", archetype: "analyst", location: "Dubai" },
	{ name: "Ganesh Subramanian", archetype: "java-backend", location: "Chennai" },
	{ name: "Sophie Meyer", archetype: "mobile", location: "Amsterdam" },
	{ name: "Imran Qureshi", archetype: "architect", location: "Dubai" },
	{ name: "Neha Agarwal", archetype: "ai-engineer", location: "Bengaluru" },
	{ name: "Robert Kavanagh", archetype: "qa", location: "London" },
	{ name: "Dana Al Hashimi", archetype: "fullstack", location: "Dubai" },
	{ name: "Manoj Thomas", archetype: "data-engineer", location: "Kochi" },
	{ name: "Freya Nilsen", archetype: "azure-devops", location: "Stockholm" },
	{ name: "Waleed Rashid", archetype: "mobile", location: "Dubai" },
	{ name: "Ishita Banerjee", archetype: "php-backend", location: "Bengaluru" },
	{ name: "Adam Whitfield", archetype: "aws-devops", location: "London" },
	{ name: "Maya Haddad", archetype: "designer", location: "Dubai" },
	{ name: "Suresh Babu", archetype: "java-backend", location: "Chennai" },
	{ name: "Carmen Ortiz", archetype: "mobile", location: "Barcelona" },
	{ name: "Yasir Malik", archetype: "qa", location: "Dubai" },
	{ name: "Ananya Sharma", archetype: "data-scientist", location: "Bengaluru" },
];

const SENIORITY_BY_YEARS = (years: number): string => {
	if (years >= 14) return "Principal";
	if (years >= 11) return "Lead";
	if (years >= 6) return "Senior";
	if (years >= 3) return "Mid";
	return "Junior";
};

const TITLE_PREFIX: Record<string, string> = {
	Junior: "Junior ",
	Mid: "",
	Senior: "Senior ",
	Lead: "Lead ",
	Principal: "Principal ",
};

const AVAILABILITY = ["Available", "Available", "Partially Available", "Allocated"];

function slugEmail(name: string): string {
	return `${name.toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, ".")}@example-consulting.test`;
}

export const EMPLOYEES: SeedEmployee[] = PEOPLE.map((person, index) => {
	const employeeId = `EMP${String(index + 1).padStart(3, "0")}`;
	const archetype = ARCHETYPES.find((a) => a.key === person.archetype)!;
	const seed = `${employeeId}:${person.name}`;

	const yearsOfExperience = pick(`${seed}:years`, 2, 16);
	const seniority = SENIORITY_BY_YEARS(yearsOfExperience);

	// Core skills scale with seniority: a Principal is not a 6/10 in their own
	// specialism, and a Junior is not a 10/10 in anything.
	const ceiling = Math.min(10, 5 + Math.floor(yearsOfExperience / 2));

	const skills = [
		...archetype.core.map((skillName, position) => ({
			skillId: id(skillName),
			proficiency: Math.max(6, ceiling - pick(`${seed}:${skillName}:p`, 0, 2) - (position > 2 ? 1 : 0)),
			years: Math.max(1, yearsOfExperience - pick(`${seed}:${skillName}:y`, 0, 3)),
			lastUsed: pickOne(`${seed}:${skillName}:u`, ["2026-07-01", "2026-05-01", "2026-02-01", "2025-11-01"]),
		})),
		...archetype.secondary
			// Not everyone picks up every secondary skill - that variance is
			// what creates genuine skill gaps for the gap analysis to find.
			.filter((skillName) => hash(`${seed}:${skillName}:has`) % 100 < 62)
			.map((skillName) => ({
				skillId: id(skillName),
				proficiency: pick(`${seed}:${skillName}:sp`, 4, Math.max(5, ceiling - 2)),
				years: Math.max(1, pick(`${seed}:${skillName}:sy`, 1, Math.max(2, yearsOfExperience - 2))),
				lastUsed: pickOne(`${seed}:${skillName}:su`, ["2026-06-01", "2026-01-01", "2025-09-01", "2025-04-01"]),
			})),
	];

	// De-duplicate: an archetype could in principle list a skill twice.
	const uniqueSkills = Array.from(new Map(skills.map((s) => [s.skillId, s])).values());

	const jobTitle = `${TITLE_PREFIX[seniority]}${archetype.jobTitle}`;

	return {
		id: employeeId,
		name: person.name,
		email: slugEmail(person.name),
		jobTitle,
		department: archetype.department,
		location: person.location,
		yearsOfExperience,
		availability: pickOne(`${seed}:avail`, AVAILABILITY),
		seniority,
		bio: `${jobTitle} based in ${person.location} with ${yearsOfExperience} years of delivery experience across ${archetype.department.toLowerCase()} engagements.`,
		teamId: archetype.teamId,
		roleId: archetype.roleId,
		skills: uniqueSkills,
		certificationIds: archetype.certifications.filter(
			(_, position) => hash(`${seed}:cert:${position}`) % 100 < 70,
		),
	};
});

// ---------------------------------------------------------------------------
// Projects
//
// PRJ001 is the demo scenario and is deliberately left UNSTAFFED - it is the
// project a manager has just won and needs a team for. Everything else is
// delivery history, which is what gives the recommendation engine evidence.
// ---------------------------------------------------------------------------

const req = (name: string, proficiency: number, years = 0) => ({
	skillId: id(name),
	proficiency,
	years,
});

export const PROJECTS: SeedProject[] = [
	{
		id: "PRJ001",
		name: "UAE Digital Banking Platform",
		description:
			"Greenfield retail banking platform covering onboarding, accounts, payments and a customer analytics layer. Delivery has not started - the team is still being assembled.",
		status: "Planned",
		startDate: "2026-09-01",
		endDate: null,
		domain: "Banking",
		location: "Dubai",
		teamSize: 6,
		clientId: "CLI001",
		requiredSkills: [
			req("React", 8, 3),
			req("Node.js", 8, 3),
			req("Python", 6, 2),
			req("AWS", 8, 3),
			req("PostgreSQL", 6, 2),
		],
		technologyIds: [id("React"), id("Node.js"), id("Python"), id("AWS"), id("PostgreSQL"), id("Docker")],
	},
	{
		id: "PRJ002",
		name: "Core Banking Modernisation",
		description: "Migration of a monolithic core banking system to event-driven services.",
		status: "Completed",
		startDate: "2023-01-15",
		endDate: "2024-06-30",
		domain: "Banking",
		location: "Dubai",
		teamSize: 9,
		clientId: "CLI001",
		requiredSkills: [req("Java", 8), req("Spring Boot", 8), req("Kafka", 7), req("PostgreSQL", 7), req("Kubernetes", 6)],
		technologyIds: [id("Java"), id("Spring Boot"), id("Kafka"), id("PostgreSQL"), id("Kubernetes"), id("Docker")],
	},
	{
		id: "PRJ003",
		name: "Retail Banking Web Portal",
		description: "Customer-facing banking portal with accounts, transfers and statements.",
		status: "Completed",
		startDate: "2023-06-01",
		endDate: "2024-09-30",
		domain: "Banking",
		location: "London",
		teamSize: 7,
		clientId: "CLI011",
		requiredSkills: [req("React", 8), req("Node.js", 7), req("TypeScript", 7), req("AWS", 6), req("PostgreSQL", 6)],
		technologyIds: [id("React"), id("Node.js"), id("TypeScript"), id("AWS"), id("PostgreSQL")],
	},
	{
		id: "PRJ004",
		name: "Cross-Border Payments Hub",
		description: "High-throughput payments routing and settlement platform.",
		status: "Active",
		startDate: "2024-03-01",
		endDate: null,
		domain: "FinTech",
		location: "London",
		teamSize: 8,
		clientId: "CLI009",
		requiredSkills: [req("Node.js", 8), req("Kafka", 7), req("PostgreSQL", 7), req("AWS", 7), req("Redis", 6)],
		technologyIds: [id("Node.js"), id("Kafka"), id("PostgreSQL"), id("AWS"), id("Redis"), id("Docker")],
	},
	{
		id: "PRJ005",
		name: "Merchant Onboarding Portal",
		description: "Self-service merchant onboarding with KYC workflow automation.",
		status: "Completed",
		startDate: "2022-09-01",
		endDate: "2023-12-15",
		domain: "FinTech",
		location: "Dubai",
		teamSize: 6,
		clientId: "CLI009",
		requiredSkills: [req("React", 7), req("Python", 7), req("PostgreSQL", 6), req("Docker", 6)],
		technologyIds: [id("React"), id("Python"), id("PostgreSQL"), id("Docker"), id("Laravel")],
	},
	{
		id: "PRJ006",
		name: "Patient Records Platform",
		description: "Unified patient record system across hospitals and clinics.",
		status: "Completed",
		startDate: "2023-02-01",
		endDate: "2024-08-31",
		domain: "Healthcare",
		location: "Abu Dhabi",
		teamSize: 8,
		clientId: "CLI002",
		requiredSkills: [req("Java", 7), req("Spring Boot", 7), req("PostgreSQL", 7), req("Azure", 6), req("Test Automation", 6)],
		technologyIds: [id("Java"), id("Spring Boot"), id("PostgreSQL"), id("Azure"), id("Test Automation")],
	},
	{
		id: "PRJ007",
		name: "Telemedicine Portal",
		description: "Video consultation and scheduling platform for outpatient care.",
		status: "Active",
		startDate: "2024-06-01",
		endDate: null,
		domain: "Healthcare",
		location: "Dubai",
		teamSize: 6,
		clientId: "CLI002",
		requiredSkills: [req("React", 7), req("Node.js", 7), req("TypeScript", 6), req("AWS", 6)],
		technologyIds: [id("React"), id("Node.js"), id("TypeScript"), id("AWS")],
	},
	{
		id: "PRJ008",
		name: "Omnichannel Commerce Platform",
		description: "Unified storefront, inventory and fulfilment across web, app and store.",
		status: "Completed",
		startDate: "2022-11-01",
		endDate: "2024-03-31",
		domain: "E-Commerce",
		location: "Amsterdam",
		teamSize: 10,
		clientId: "CLI010",
		requiredSkills: [req("React", 8), req("Next.js", 7), req("Node.js", 8), req("MongoDB", 6), req("Kubernetes", 7)],
		technologyIds: [id("React"), id("Next.js"), id("Node.js"), id("MongoDB"), id("Kubernetes"), id("Redis")],
	},
	{
		id: "PRJ009",
		name: "Storefront Replatform",
		description: "Rebuild of a legacy storefront on a modern rendering stack.",
		status: "Active",
		startDate: "2024-01-15",
		endDate: null,
		domain: "E-Commerce",
		location: "Stockholm",
		teamSize: 7,
		clientId: "CLI003",
		requiredSkills: [req("Next.js", 8), req("React", 8), req("TypeScript", 7), req("Tailwind CSS", 6), req("GraphQL", 6)],
		technologyIds: [id("Next.js"), id("React"), id("TypeScript"), id("Tailwind CSS"), id("GraphQL")],
	},
	{
		id: "PRJ010",
		name: "Marketplace Search Revamp",
		description: "Relevance tuning and personalised ranking for marketplace search.",
		status: "Completed",
		startDate: "2023-04-01",
		endDate: "2024-05-31",
		domain: "E-Commerce",
		location: "Dubai",
		teamSize: 6,
		clientId: "CLI010",
		requiredSkills: [req("Python", 8), req("Machine Learning", 7), req("SQL", 7), req("AWS", 6)],
		technologyIds: [id("Python"), id("Machine Learning"), id("SQL"), id("AWS")],
	},
	{
		id: "PRJ011",
		name: "Fleet Tracking System",
		description: "Real-time vehicle telemetry ingestion and operations dashboards.",
		status: "Completed",
		startDate: "2023-03-01",
		endDate: "2024-07-31",
		domain: "Logistics",
		location: "Singapore",
		teamSize: 8,
		clientId: "CLI005",
		requiredSkills: [req("Kafka", 8), req("Python", 7), req("PostgreSQL", 7), req("Kubernetes", 6), req("React", 6)],
		technologyIds: [id("Kafka"), id("Python"), id("PostgreSQL"), id("Kubernetes"), id("React")],
	},
	{
		id: "PRJ012",
		name: "Warehouse Automation Suite",
		description: "Picking optimisation and robotics integration for distribution centres.",
		status: "Active",
		startDate: "2024-05-01",
		endDate: null,
		domain: "Logistics",
		location: "Dubai",
		teamSize: 7,
		clientId: "CLI005",
		requiredSkills: [req("Python", 8), req("Machine Learning", 7), req("Docker", 6), req("PostgreSQL", 6)],
		technologyIds: [id("Python"), id("Machine Learning"), id("Docker"), id("PostgreSQL")],
	},
	{
		id: "PRJ013",
		name: "Claims Processing Automation",
		description: "Straight-through claims processing with document intelligence.",
		status: "Completed",
		startDate: "2022-10-01",
		endDate: "2024-01-31",
		domain: "Insurance",
		location: "London",
		teamSize: 9,
		clientId: "CLI004",
		requiredSkills: [req(".NET Core", 7), req("Azure", 8), req("SQL", 7), req("Test Automation", 6)],
		technologyIds: [id(".NET Core"), id("Azure"), id("SQL"), id("Test Automation")],
	},
	{
		id: "PRJ014",
		name: "Underwriting Risk Engine",
		description: "Model-driven risk scoring for commercial underwriting.",
		status: "Active",
		startDate: "2024-04-01",
		endDate: null,
		domain: "Insurance",
		location: "London",
		teamSize: 6,
		clientId: "CLI004",
		requiredSkills: [req("Python", 8), req("Machine Learning", 8), req("SQL", 7), req("Azure", 6)],
		technologyIds: [id("Python"), id("Machine Learning"), id("SQL"), id("Azure")],
	},
	{
		id: "PRJ015",
		name: "Subscriber Self-Service Portal",
		description: "Account management, billing and plan changes for mobile subscribers.",
		status: "Completed",
		startDate: "2023-05-01",
		endDate: "2024-10-31",
		domain: "Telecom",
		location: "Dubai",
		teamSize: 8,
		clientId: "CLI006",
		requiredSkills: [req("Angular", 7), req("Java", 7), req("Spring Boot", 7), req("PostgreSQL", 6), req("Performance Testing", 6)],
		technologyIds: [id("Angular"), id("Java"), id("Spring Boot"), id("PostgreSQL"), id("Performance Testing")],
	},
	{
		id: "PRJ016",
		name: "Network Analytics Platform",
		description: "Streaming network telemetry with anomaly detection.",
		status: "Active",
		startDate: "2024-07-01",
		endDate: null,
		domain: "Telecom",
		location: "Abu Dhabi",
		teamSize: 7,
		clientId: "CLI006",
		requiredSkills: [req("Kafka", 8), req("Python", 8), req("Machine Learning", 7), req("Kubernetes", 6)],
		technologyIds: [id("Kafka"), id("Python"), id("Machine Learning"), id("Kubernetes")],
	},
	{
		id: "PRJ017",
		name: "Travel Booking Engine",
		description: "Multi-supplier search, pricing and reservation engine.",
		status: "Completed",
		startDate: "2022-08-01",
		endDate: "2023-11-30",
		domain: "Travel",
		location: "Barcelona",
		teamSize: 7,
		clientId: "CLI007",
		requiredSkills: [req("Vue.js", 7), req("Node.js", 7), req("Redis", 7), req("PostgreSQL", 6)],
		technologyIds: [id("Vue.js"), id("Node.js"), id("Redis"), id("PostgreSQL")],
	},
	{
		id: "PRJ018",
		name: "Citizen Services Portal",
		description: "Single sign-on portal for government services and permits.",
		status: "Completed",
		startDate: "2023-07-01",
		endDate: "2024-12-31",
		domain: "Government",
		location: "Dubai",
		teamSize: 9,
		clientId: "CLI008",
		requiredSkills: [req("Angular", 7), req(".NET Core", 7), req("Azure", 7), req("SQL", 6), req("Test Automation", 6)],
		technologyIds: [id("Angular"), id(".NET Core"), id("Azure"), id("SQL"), id("Test Automation")],
	},
	{
		id: "PRJ019",
		name: "Smart City Data Hub",
		description: "Central ingestion and sharing platform for municipal data sources.",
		status: "Active",
		startDate: "2024-08-01",
		endDate: null,
		domain: "Government",
		location: "Dubai",
		teamSize: 8,
		clientId: "CLI008",
		requiredSkills: [req("Python", 8), req("Kafka", 7), req("PostgreSQL", 7), req("AWS", 7), req("Generative AI", 6)],
		technologyIds: [id("Python"), id("Kafka"), id("PostgreSQL"), id("AWS"), id("Generative AI")],
	},
	{
		id: "PRJ020",
		name: "Loyalty Programme Platform",
		description: "Points, tiers and personalised offers across retail channels.",
		status: "Completed",
		startDate: "2023-09-01",
		endDate: "2024-11-30",
		domain: "Retail",
		location: "Dubai",
		teamSize: 6,
		clientId: "CLI012",
		requiredSkills: [req("React", 7), req("Node.js", 7), req("MongoDB", 6), req("Redis", 6)],
		technologyIds: [id("React"), id("Node.js"), id("MongoDB"), id("Redis")],
	},
];

// ---------------------------------------------------------------------------
// Staffing history
//
// Assignment is skill-driven, not random: for each project we score every
// employee against its required skills and take the best fit, rotating the
// starting point per project so the same handful of people are not on
// everything. This is what makes WORKED_WITH a real signal later.
// ---------------------------------------------------------------------------

const ROLE_LABEL: Record<string, string> = {
	frontend: "Frontend Developer",
	"node-backend": "Backend Developer",
	"java-backend": "Backend Developer",
	"python-backend": "Backend Developer",
	fullstack: "Full Stack Developer",
	"aws-devops": "DevOps Engineer",
	"azure-devops": "Cloud Engineer",
	"data-engineer": "Data Engineer",
	"data-scientist": "Data Scientist",
	"ai-engineer": "AI Engineer",
	qa: "QA Engineer",
	architect: "Solution Architect",
	designer: "UI/UX Designer",
	delivery: "Project Manager",
	"php-backend": "Backend Developer",
	mobile: "Mobile Developer",
	analyst: "Business Analyst",
};

const ARCHETYPE_OF = new Map(PEOPLE.map((p, i) => [`EMP${String(i + 1).padStart(3, "0")}`, p.archetype]));

function fitScore(employee: SeedEmployee, project: SeedProject): number {
	const held = new Map(employee.skills.map((s) => [s.skillId, s.proficiency]));
	let score = 0;
	for (const required of project.requiredSkills) {
		const proficiency = held.get(required.skillId);
		if (proficiency === undefined) continue;
		score += 10 + Math.max(0, proficiency - required.proficiency) * 2;
	}
	return score;
}

export function buildAssignments(): SeedAssignment[] {
	const assignments: SeedAssignment[] = [];
	// Tracks how many projects each person is already on, so staffing spreads
	// across the bench instead of piling onto the same top scorers.
	const load = new Map<string, number>();

	for (const project of PROJECTS) {
		// PRJ001 is the unstaffed demo project.
		if (project.status === "Planned") continue;

		const ranked = EMPLOYEES.map((employee) => ({
			employee,
			score: fitScore(employee, project) - (load.get(employee.id) ?? 0) * 3 + (hash(`${project.id}:${employee.id}`) % 5),
		}))
			.filter((entry) => entry.score > 0)
			.sort((a, b) => b.score - a.score || a.employee.id.localeCompare(b.employee.id));

		const team = ranked.slice(0, project.teamSize);

		// Every delivery needs someone accountable, so make sure a delivery
		// person is on it even though they score nothing on technical skills.
		const managers = EMPLOYEES.filter((e) => ARCHETYPE_OF.get(e.id) === "delivery");
		const manager = managers[hash(`${project.id}:pm`) % managers.length];
		if (!team.some((entry) => entry.employee.id === manager.id)) {
			team.pop();
			team.push({ employee: manager, score: 0 });
		}

		for (const { employee } of team) {
			load.set(employee.id, (load.get(employee.id) ?? 0) + 1);
			const archetype = ARCHETYPE_OF.get(employee.id)!;
			const seniorPrefix = ["Senior", "Lead", "Principal"].includes(employee.seniority) ? "Senior " : "";

			assignments.push({
				employeeId: employee.id,
				projectId: project.id,
				role: `${seniorPrefix}${ROLE_LABEL[archetype]}`,
				startDate: project.startDate,
				endDate: project.endDate,
				responsibility: responsibilityFor(archetype),
			});
		}
	}

	return assignments;
}

function responsibilityFor(archetype: string): string {
	switch (archetype) {
		case "frontend":
			return "Frontend architecture, component library and accessibility";
		case "node-backend":
		case "java-backend":
		case "python-backend":
			return "Service design, API delivery and data access";
		case "fullstack":
			return "End-to-end feature delivery across UI and services";
		case "aws-devops":
		case "azure-devops":
			return "Infrastructure as code, pipelines and production readiness";
		case "data-engineer":
			return "Ingestion pipelines, data modelling and quality";
		case "data-scientist":
			return "Model development, evaluation and reporting";
		case "ai-engineer":
			return "Model integration, prompt design and evaluation harness";
		case "qa":
			return "Test strategy, automation coverage and release sign-off";
		case "architect":
			return "Solution architecture, non-functional requirements and governance";
		case "designer":
			return "Interaction design, design system and usability testing";
		default:
			return "Delivery planning, stakeholder management and reporting";
	}
}

/**
 * WORKED_WITH is DERIVED, never authored.
 *
 * Two people are collaborators because they actually appear on the same
 * projects in the data above. Hand-seeding this relationship would make the
 * collaboration score a fiction dressed up as a graph traversal.
 */
export function deriveCollaborations(assignments: SeedAssignment[]): SeedCollaboration[] {
	const byProject = new Map<string, string[]>();
	for (const assignment of assignments) {
		const list = byProject.get(assignment.projectId) ?? [];
		list.push(assignment.employeeId);
		byProject.set(assignment.projectId, list);
	}

	const pairs = new Map<string, { a: string; b: string; projects: string[] }>();
	// PROJECTS is ordered, so "last project" is deterministic.
	const projectOrder = new Map(PROJECTS.map((p, index) => [p.id, index]));

	for (const [projectId, members] of Array.from(byProject.entries())) {
		const sorted = [...members].sort();
		for (let i = 0; i < sorted.length; i += 1) {
			for (let j = i + 1; j < sorted.length; j += 1) {
				const key = `${sorted[i]}|${sorted[j]}`;
				const entry = pairs.get(key) ?? { a: sorted[i], b: sorted[j], projects: [] };
				entry.projects.push(projectId);
				pairs.set(key, entry);
			}
		}
	}

	return Array.from(pairs.values()).map((entry) => {
		const last = [...entry.projects].sort(
			(x, y) => (projectOrder.get(y) ?? 0) - (projectOrder.get(x) ?? 0),
		)[0];
		return {
			a: entry.a,
			b: entry.b,
			projectsTogether: entry.projects.length,
			lastProject: last,
		};
	});
}

export const ASSIGNMENTS = buildAssignments();
export const COLLABORATIONS = deriveCollaborations(ASSIGNMENTS);
