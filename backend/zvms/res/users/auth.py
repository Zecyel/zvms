from enum import IntFlag

class AUTH(IntFlag):
    mePageOnNav = 0b00000000,
    login = 0b00000000,
    auditSignup = 0b00000000,
    rollbackSignup = 0b00000000,
    readSchoolNotice = 0b00000000,
    writeSchoolNotice = 0b00000000,
    readClassNotice = 0b00000000,
    writeClassNotice = 0b00000000,
    readAnyNotice = 0b00000000,
    writeAnyNotice = 0b00000000,
    readMyVol = 0b00000000,
    writeMyVol = 0b00000000,
    readClassVol = 0b00000000,
    writeClassVol = 0b00000000,
    readAnyVol = 0b00000000,
    writeAnyVol = 0b00000000,
    readMyUserInfo = 0b00000000,
    readClassUserInfo = 0b00000000,
    readAnyUserInfo = 0b00000000,
    writeUserInfo = 0b00000000,
    readAnyClass = 0b00000000,
    writeClass = 0b00000000
