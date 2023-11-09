import { personCategories } from "./personCategories";

interface Permission { GET?: boolean, POST?: boolean, PUT?: boolean, DELETE?: boolean }

const firstLevelPermissions: Permission = { GET: true, POST: false, PUT: false, DELETE: false }
const secondLevelPermissions: Permission = { GET: true, POST: true, PUT: false, DELETE: false }
const thirdLevelPermissions: Permission = { GET: true, POST: true, PUT: true, DELETE: false }
const fourthLevelPermissions: Permission = { GET: true, POST: true, PUT: true, DELETE: true }

const arrayOfPermissions:{ category: number, permissions: { entity: string, methods: Permission }[]}[] = [
    {
        category: personCategories.ADMINISTRADOR,
        permissions: [
            {
                entity: "classroom",
                methods: fourthLevelPermissions
            },
            {
                entity: "teacher",
                methods: fourthLevelPermissions
            },
            {
                entity: "student",
                methods: fourthLevelPermissions
            },
            {
                entity: "transfer",
                methods: fourthLevelPermissions
            },
            {
                entity: "test",
                methods: fourthLevelPermissions
            },
            {
                entity: "year",
                methods: fourthLevelPermissions
            },
            {
                entity: "report",
                methods: firstLevelPermissions
            },
            {
                entity: "personcategory",
                methods: firstLevelPermissions
            },
            {
                entity: "studentquestion",
                methods: fourthLevelPermissions
            },
        ]
    },
    {
        category: personCategories.SUPERVISOR,
        permissions: [
            {
                entity: "year",
                methods: firstLevelPermissions
            },
            {
                entity: "test",
                methods: thirdLevelPermissions
            },
            {
                entity: "teacher",
                methods: thirdLevelPermissions
            },
            {
                entity: "student",
                methods: thirdLevelPermissions
            },
            {
                entity: "transfer",
                methods: thirdLevelPermissions
            },
            {
                entity: "classroom",
                methods: firstLevelPermissions
            },
            {
                entity: "report",
                methods: firstLevelPermissions
            },
            {
                entity: "personcategory",
                methods: firstLevelPermissions
            },
            {
                entity: "studentquestion",
                methods: thirdLevelPermissions
            },
        ]
    },
    {
        category: personCategories.DIRETOR,
        permissions: [
            {
                entity: "year",
                methods: firstLevelPermissions
            },
            {
                entity: "test",
                methods: thirdLevelPermissions
            },
            {
                entity: "teacher",
                methods: thirdLevelPermissions
            },
            {
                entity: "student",
                methods: thirdLevelPermissions
            },
            {
                entity: "transfer",
                methods: thirdLevelPermissions
            },
            {
                entity: "classroom",
                methods: firstLevelPermissions
            },
            {
                entity: "personcategory",
                methods: firstLevelPermissions
            },
            {
                entity: "studentquestion",
                methods: thirdLevelPermissions
            },
        ]
    },
    {
        category: personCategories.VICE_DIRETOR,
        permissions: [
            {
                entity: "year",
                methods: firstLevelPermissions
            },
            {
                entity: "test",
                methods: thirdLevelPermissions
            },
            {
                entity: "teacher",
                methods: thirdLevelPermissions
            },
            {
                entity: "student",
                methods: thirdLevelPermissions
            },
            {
                entity: "transfer",
                methods: thirdLevelPermissions
            },
            {
                entity: "classroom",
                methods: firstLevelPermissions
            },
            {
                entity: "personcategory",
                methods: firstLevelPermissions
            },
            {
                entity: "studentquestion",
                methods: thirdLevelPermissions
            },
        ]
    },
    {
        category: personCategories.COORDENADOR,
        permissions: [
            {
                entity: "year",
                methods: firstLevelPermissions
            },
            {
                entity: "test",
                methods: thirdLevelPermissions
            },
            {
                entity: "teacher",
                methods: thirdLevelPermissions
            },
            {
                entity: "student",
                methods: thirdLevelPermissions
            },
            {
                entity: "transfer",
                methods: thirdLevelPermissions
            },
            {
                entity: "classroom",
                methods: firstLevelPermissions
            },
            {
                entity: "personcategory",
                methods: firstLevelPermissions
            },
            {
                entity: "studentquestion",
                methods: thirdLevelPermissions
            },
        ]
    },
    {
        category: personCategories.SECRETARIO,
        permissions: [
            {
                entity: "year",
                methods: firstLevelPermissions
            },
            {
                entity: "test",
                methods: firstLevelPermissions
            },
            {
                entity: "teacher",
                methods: thirdLevelPermissions
            },
            {
                entity: "student",
                methods: thirdLevelPermissions
            },
            {
                entity: "transfer",
                methods: thirdLevelPermissions
            },
            {
                entity: "classroom",
                methods: firstLevelPermissions
            },
            {
                entity: "personcategory",
                methods: firstLevelPermissions
            },
            {
                entity: "studentquestion",
                methods: firstLevelPermissions
            },
        ]
    },
    {
        category: personCategories.MONITOR_DE_INFORMATICA,
        permissions: [
            {
                entity: "year",
                methods: firstLevelPermissions
            },
            {
                entity: "test",
                methods: firstLevelPermissions
            },
            {
                entity: "teacher",
                methods: firstLevelPermissions
            },
            {
                entity: "student",
                methods: secondLevelPermissions
            },
            {
                entity: "transfer",
                methods: firstLevelPermissions
            },
            {
                entity: "classroom",
                methods: firstLevelPermissions
            },
            {
                entity: "personcategory",
                methods: firstLevelPermissions
            },
            {
                entity: "studentquestion",
                methods: firstLevelPermissions
            },
        ]
    },
    {
        category: personCategories.PROFESSOR,
        permissions: [
            {
                entity: "classroom",
                methods: firstLevelPermissions
            },
            {
                entity: "year",
                methods: firstLevelPermissions
            },
            {
                entity: "teacher",
                methods: firstLevelPermissions
            },
            {
                entity: "student",
                methods: thirdLevelPermissions
            },
            {
                entity: "transfer",
                methods: thirdLevelPermissions
            },
            {
                entity: "test",
                methods: thirdLevelPermissions
            },
            {
                entity: "personcategory",
                methods: firstLevelPermissions
            },
            {
                entity: "studentquestion",
                methods: thirdLevelPermissions
            },
        ]
    }
]

function userHasPermission(category: number, entity: string, method: string) {
    return !!arrayOfPermissions.find((permission) => {
        return permission.category === category && permission.permissions.find((permission) => {
            return permission.entity === entity && permission.methods[method as keyof Permission]
        })
    })
}

export default (category: number, entity: string, method: string) => {
    return userHasPermission(category, entity, method)
}
