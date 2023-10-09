import { personCategories } from "./personCategories";

interface Permission { GET?: boolean, POST?: boolean, PUT?: boolean, DELETE?: boolean }

const permissionsArray: { entity: string, category: number, methods: Permission }[] = [
    {
        entity: "classroom",
        category: personCategories.PROFESSOR,
        methods: {
            GET: true,
        }
    },
    {
        entity: "teacher",
        category: personCategories.PROFESSOR,
        methods: {
            GET: false,
            PUT: true,
        }
    }
]

function userHasPermission(category: number, entity: string, method: string) {
    return !!permissionsArray.find((permission) => {
        return permission.category === category && permission.entity === entity && permission.methods[method as keyof Permission]
    })
}

export default (category: number, entity: string, method: string) => {
    return userHasPermission(category, entity, method)
}
