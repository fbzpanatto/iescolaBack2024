import { personCategories } from "./personCategories";

interface Permission { GET?: boolean, POST?: boolean, PUT?: boolean, DELETE?: boolean }
const allPermissions: Permission = { GET: true, POST: true, PUT: true, DELETE: true }

const arrayOfPermissions:{ category: number, permissions: { entity: string, methods: Permission }[]}[] = [
    {
        category: personCategories.SECRETARIO,
        permissions: [
            {
                entity: "year",
                methods: { GET: true }
            },
            {
                entity: "test",
                methods: { GET: true }
            },
            {
                entity: "teacher",
                methods: { GET: true, POST: true, PUT: true }
            },
            {
                entity: "student",
                methods: { GET: true, POST: true, PUT: true }
            },
            {
                entity: "transfer",
                methods: { GET: true, POST: true, PUT: true }
            },
            {
                entity: "classroom",
                methods: { GET: true }
            },
        ]
    },
    {
        category: personCategories.MONITOR_DE_INFORMATICA,
        permissions: [
            {
                entity: "year",
                methods: { GET: true }
            },
            {
                entity: "test",
                methods: { GET: true }
            },
            {
                entity: "teacher",
                methods: { GET: true, POST: true }
            },
            {
                entity: "student",
                methods: { GET: true, POST: true }
            },
            {
                entity: "transfer",
                methods: { GET: true}
            },
            {
                entity: "classroom",
                methods: { GET: true }
            },
        ]
    },
    {
        category: personCategories.PROFESSOR,
        permissions: [
            {
                entity: "classroom",
                methods: { GET: true }
            },
            {
                entity: "year",
                methods: { GET: true }
            },
            {
                entity: "teacher",
                methods: { GET: true }
            },
            {
                entity: "student",
                methods: { GET: true, POST: true, PUT: true }
            },
            {
                entity: "transfer",
                methods: { GET: true, POST: true, PUT: true }
            },
            {
                entity: "test",
                methods: allPermissions
            },
        ]
    },
    {
        category: personCategories.ADMINISTRADOR,
        permissions: [
            {
                entity: "classroom",
                methods: allPermissions
            },
            {
                entity: "teacher",
                methods: allPermissions
            },
            {
                entity: "student",
                methods: allPermissions
            },
            {
                entity: "transfer",
                methods: allPermissions
            },
            {
                entity: "test",
                methods: allPermissions
            },
            {
                entity: "report",
                methods: allPermissions
            },
            {
                entity: "year",
                methods: allPermissions
            }
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
