"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const personCategories_1 = require("./personCategories");
const onlyGET = { GET: true, POST: false, PUT: false, DELETE: false };
const getPostPut = { GET: true, POST: true, PUT: true, DELETE: false };
const arrayOfPermissions = [
    {
        category: personCategories_1.pc.ADMN,
        permissions: [
            {
                entity: "classroom",
                methods: getPostPut
            },
            {
                entity: "teacher",
                methods: getPostPut
            },
            {
                entity: "student",
                methods: getPostPut
            },
            {
                entity: "transfer",
                methods: getPostPut
            },
            {
                entity: "test",
                methods: getPostPut
            },
            {
                entity: "year",
                methods: getPostPut
            },
            {
                entity: "report",
                methods: getPostPut
            },
            {
                entity: "personcategory",
                methods: getPostPut
            },
            {
                entity: "studentquestion",
                methods: getPostPut
            },
            {
                entity: "literacy",
                methods: getPostPut
            },
            {
                entity: "literacysecond",
                methods: getPostPut
            },
            {
                entity: "textgendergrade",
                methods: getPostPut
            },
            {
                entity: "textgenderreport",
                methods: getPostPut
            },
            {
                entity: "literacyreport",
                methods: getPostPut
            }
        ]
    },
    {
        category: personCategories_1.pc.FORM,
        permissions: [
            {
                entity: "personcategory",
                methods: onlyGET
            },
            {
                entity: "year",
                methods: onlyGET
            },
            {
                entity: "report",
                methods: onlyGET
            },
            {
                entity: "classroom",
                methods: onlyGET
            },
            {
                entity: "teacher",
                methods: getPostPut
            },
            {
                entity: "student",
                methods: getPostPut
            },
            {
                entity: "test",
                methods: getPostPut
            },
            {
                entity: "transfer",
                methods: getPostPut
            },
            {
                entity: "studentquestion",
                methods: getPostPut
            },
            {
                entity: "literacy",
                methods: getPostPut
            },
            {
                entity: "literacysecond",
                methods: getPostPut
            },
            {
                entity: "textgendergrade",
                methods: getPostPut
            },
            {
                entity: "textgenderreport",
                methods: getPostPut
            },
            {
                entity: "literacyreport",
                methods: onlyGET
            }
        ]
    },
    {
        category: personCategories_1.pc.SUPE,
        permissions: [
            {
                entity: "personcategory",
                methods: onlyGET
            },
            {
                entity: "year",
                methods: onlyGET
            },
            {
                entity: "report",
                methods: onlyGET
            },
            {
                entity: "classroom",
                methods: onlyGET
            },
            {
                entity: "teacher",
                methods: onlyGET
            },
            {
                entity: "student",
                methods: onlyGET
            },
            {
                entity: "test",
                methods: onlyGET
            },
            {
                entity: "transfer",
                methods: onlyGET
            },
            {
                entity: "studentquestion",
                methods: onlyGET
            },
            {
                entity: "literacy",
                methods: onlyGET
            },
            {
                entity: "literacysecond",
                methods: onlyGET
            },
            {
                entity: "textgendergrade",
                methods: onlyGET
            },
            {
                entity: "textgenderreport",
                methods: onlyGET
            },
            {
                entity: "literacyreport",
                methods: onlyGET
            }
        ]
    },
    {
        category: personCategories_1.pc.DIRE,
        permissions: [
            {
                entity: "year",
                methods: onlyGET
            },
            {
                entity: "test",
                methods: onlyGET
            },
            {
                entity: "teacher",
                methods: getPostPut
            },
            {
                entity: "student",
                methods: getPostPut
            },
            {
                entity: "transfer",
                methods: onlyGET
            },
            {
                entity: "classroom",
                methods: onlyGET
            },
            {
                entity: "personcategory",
                methods: onlyGET
            },
            {
                entity: "studentquestion",
                methods: onlyGET
            },
            {
                entity: "literacy",
                methods: onlyGET
            },
            {
                entity: "literacysecond",
                methods: onlyGET
            },
            {
                entity: "textgendergrade",
                methods: onlyGET
            },
        ]
    },
    {
        category: personCategories_1.pc.VICE,
        permissions: [
            {
                entity: "year",
                methods: onlyGET
            },
            {
                entity: "test",
                methods: onlyGET
            },
            {
                entity: "teacher",
                methods: getPostPut
            },
            {
                entity: "student",
                methods: getPostPut
            },
            {
                entity: "transfer",
                methods: onlyGET
            },
            {
                entity: "classroom",
                methods: onlyGET
            },
            {
                entity: "personcategory",
                methods: onlyGET
            },
            {
                entity: "studentquestion",
                methods: onlyGET
            },
            {
                entity: "literacy",
                methods: onlyGET
            },
            {
                entity: "literacysecond",
                methods: onlyGET
            },
            {
                entity: "textgendergrade",
                methods: onlyGET
            },
        ]
    },
    {
        category: personCategories_1.pc.COOR,
        permissions: [
            {
                entity: "year",
                methods: onlyGET
            },
            {
                entity: "test",
                methods: onlyGET
            },
            {
                entity: "teacher",
                methods: getPostPut
            },
            {
                entity: "student",
                methods: getPostPut
            },
            {
                entity: "transfer",
                methods: onlyGET
            },
            {
                entity: "classroom",
                methods: onlyGET
            },
            {
                entity: "personcategory",
                methods: onlyGET
            },
            {
                entity: "studentquestion",
                methods: onlyGET
            },
            {
                entity: "literacy",
                methods: onlyGET
            },
            {
                entity: "literacysecond",
                methods: onlyGET
            },
            {
                entity: "textgendergrade",
                methods: onlyGET
            },
        ]
    },
    {
        category: personCategories_1.pc.SECR,
        permissions: [
            {
                entity: "year",
                methods: onlyGET
            },
            {
                entity: "test",
                methods: onlyGET
            },
            {
                entity: "teacher",
                methods: getPostPut
            },
            {
                entity: "student",
                methods: getPostPut
            },
            {
                entity: "transfer",
                methods: getPostPut
            },
            {
                entity: "classroom",
                methods: onlyGET
            },
            {
                entity: "personcategory",
                methods: onlyGET
            },
            {
                entity: "studentquestion",
                methods: onlyGET
            },
            {
                entity: "literacy",
                methods: onlyGET
            },
            {
                entity: "literacysecond",
                methods: onlyGET
            },
            {
                entity: "textgendergrade",
                methods: onlyGET
            },
        ]
    },
    {
        category: personCategories_1.pc.MONI,
        permissions: [
            {
                entity: "year",
                methods: onlyGET
            },
            {
                entity: "test",
                methods: onlyGET
            },
            {
                entity: "teacher",
                methods: onlyGET
            },
            {
                entity: "student",
                methods: getPostPut
            },
            {
                entity: "transfer",
                methods: onlyGET
            },
            {
                entity: "classroom",
                methods: onlyGET
            },
            {
                entity: "personcategory",
                methods: onlyGET
            },
            {
                entity: "studentquestion",
                methods: onlyGET
            },
            {
                entity: "literacy",
                methods: onlyGET
            },
            {
                entity: "literacysecond",
                methods: onlyGET
            },
            {
                entity: "textgendergrade",
                methods: onlyGET
            },
        ]
    },
    {
        category: personCategories_1.pc.PROF,
        permissions: [
            {
                entity: "personcategory",
                methods: onlyGET
            },
            {
                entity: "classroom",
                methods: onlyGET
            },
            {
                entity: "year",
                methods: onlyGET
            },
            {
                entity: "teacher",
                methods: onlyGET
            },
            {
                entity: "student",
                methods: getPostPut
            },
            {
                entity: "transfer",
                methods: getPostPut
            },
            {
                entity: "test",
                methods: getPostPut
            },
            {
                entity: "studentquestion",
                methods: getPostPut
            },
            {
                entity: "literacy",
                methods: getPostPut
            },
            {
                entity: "literacysecond",
                methods: getPostPut
            },
            {
                entity: "textgendergrade",
                methods: getPostPut
            },
        ]
    }
];
function userHasPermission(category, entity, method) {
    return !!arrayOfPermissions.find((permission) => {
        return permission.category === category && permission.permissions.find((permission) => {
            return permission.entity === entity && permission.methods[method];
        });
    });
}
exports.default = (category, entity, method) => {
    return userHasPermission(category, entity, method);
};
